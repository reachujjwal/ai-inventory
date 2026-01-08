import { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import api from '../lib/api';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: 'products' | 'categories' | 'users' | 'coupons';
    onImportComplete: () => void;
}

export default function ImportModal({ isOpen, onClose, entityType, onImportComplete }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [duplicateChoices, setDuplicateChoices] = useState<{ [key: number]: 'update' | 'skip' }>({});
    const { showNotification } = useNotification();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.name.endsWith('.csv')) {
                setFile(selectedFile);
                setAnalysisResult(null);
            } else {
                showNotification('Please select a CSV file', 'error');
            }
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            showNotification('Please select a file', 'error');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/import/${entityType}/analyze`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Client-side filter: Remove admin role records from analysis result
            if (entityType === 'users') {
                const filteredValid = response.data.valid.filter((record: any) =>
                    !record.role || record.role.toLowerCase() !== 'admin'
                );
                const filteredDuplicates = response.data.duplicates.filter((record: any) =>
                    !record.role || record.role.toLowerCase() !== 'admin'
                );

                // Add admin records to invalid list
                const adminRecords = [
                    ...response.data.valid.filter((record: any) => record.role && record.role.toLowerCase() === 'admin'),
                    ...response.data.duplicates.filter((record: any) => record.role && record.role.toLowerCase() === 'admin')
                ].map((record: any) => ({ ...record, reason: 'Admin role cannot be imported via CSV' }));

                response.data.valid = filteredValid;
                response.data.duplicates = filteredDuplicates;
                response.data.invalid = [...response.data.invalid, ...adminRecords];
            }

            setAnalysisResult(response.data);

            // Initialize all duplicates as 'skip' by default
            const initialChoices: { [key: number]: 'update' | 'skip' } = {};
            response.data.duplicates.forEach((_: any, index: number) => {
                initialChoices[index] = 'skip';
            });
            setDuplicateChoices(initialChoices);

            showNotification(`Analysis complete: ${response.data.valid.length} new, ${response.data.duplicates.length} duplicates, ${response.data.invalid.length} invalid`, 'info');
        } catch (error: any) {
            showNotification(error.response?.data?.message || 'Failed to analyze file', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleImport = async () => {
        if (!analysisResult) return;

        const inserts = analysisResult.valid.filter((record: any) => {
            // Additional client-side check for users
            if (entityType === 'users') {
                return !record.role || record.role.toLowerCase() !== 'admin';
            }
            return true;
        });
        const updates = analysisResult.duplicates
            .filter((_: any, index: number) => duplicateChoices[index] === 'update')
            .filter((record: any) => {
                // Additional client-side check for users
                if (entityType === 'users') {
                    return !record.role || record.role.toLowerCase() !== 'admin';
                }
                return true;
            });
        const skips = analysisResult.duplicates.filter((_: any, index: number) => duplicateChoices[index] === 'skip');

        setIsUploading(true);
        try {
            const response = await api.post(`/import/${entityType}/process`, { inserts, updates, skips });
            showNotification(`Import successful: ${response.data.inserted} inserted, ${response.data.updated} updated, ${response.data.skipped} skipped`, 'success');
            onImportComplete();
            handleClose();
        } catch (error: any) {
            showNotification(error.response?.data?.message || 'Import failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setAnalysisResult(null);
        setDuplicateChoices({});
        onClose();
    };

    const toggleDuplicateChoice = (index: number) => {
        setDuplicateChoices(prev => ({
            ...prev,
            [index]: prev[index] === 'update' ? 'skip' : 'update'
        }));
    };

    const setAllDuplicates = (choice: 'update' | 'skip') => {
        const newChoices: { [key: number]: 'update' | 'skip' } = {};
        analysisResult.duplicates.forEach((_: any, index: number) => {
            newChoices[index] = choice;
        });
        setDuplicateChoices(newChoices);
    };

    const getSampleCSV = () => {
        if (entityType === 'products') {
            return 'sku,name,description,price,category_id\nPROD001,Laptop Computer,High-performance laptop,999.99,1\nPROD002,Wireless Mouse,Ergonomic wireless mouse,29.99,1\nPROD003,USB Keyboard,Mechanical keyboard,79.99,1';
        } else if (entityType === 'categories') {
            return 'name,description\nElectronics,Electronic devices and accessories\nFurniture,Office and home furniture\nStationery,Office supplies and stationery';
        } else if (entityType === 'coupons') {
            return 'code,description,discount_type,discount_value,min_purchase_amount,expires_at,usage_limit,status\nWELCOME10,10% off for new users,percentage,10,0,2026-12-31,100,active\nSAVE20,Save $20 on orders over $100,fixed,20,100,2026-06-30,,active';
        } else {
            return 'username,email,password,role\njohn_doe,john@example.com,password123,user\njane_smith,jane@example.com,password456,user\nbob_wilson,bob@example.com,password789,user';
        }
    };

    const downloadSample = () => {
        const csvContent = getSampleCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}_sample.csv`;
        a.click();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-border bg-background/50 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-lg font-black tracking-tight text-text uppercase">Import {entityType}</h3>
                    <button onClick={handleClose} className="text-text-secondary hover:text-text transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!analysisResult ? (
                        <>
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                <p className="text-sm text-text-secondary mb-2">
                                    <strong className="text-text">CSV Format:</strong> Upload a CSV file with the required columns.
                                </p>
                                <button onClick={downloadSample} className="text-primary hover:text-primary-hover text-sm font-bold underline">
                                    Download Sample CSV
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text mb-2">Select CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                />
                                {file && <p className="mt-2 text-sm text-success">Selected: {file.name}</p>}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={handleClose} disabled={isUploading} className="px-5 py-2.5 text-text-secondary font-bold hover:text-text disabled:opacity-50 transition-colors text-sm uppercase">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!file || isUploading}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-black rounded-xl shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-wide"
                                >
                                    {isUploading ? 'Analyzing...' : 'Analyze File'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-success">{analysisResult.valid.length}</p>
                                    <p className="text-xs text-text-secondary uppercase font-bold">New Records</p>
                                </div>
                                <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-warning">{analysisResult.duplicates.length}</p>
                                    <p className="text-xs text-text-secondary uppercase font-bold">Duplicates</p>
                                </div>
                                <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-black text-error">{analysisResult.invalid.length}</p>
                                    <p className="text-xs text-text-secondary uppercase font-bold">Invalid</p>
                                </div>
                            </div>

                            {analysisResult.invalid.length > 0 && (
                                <div className="bg-error/5 border border-error/20 rounded-xl p-4">
                                    <h4 className="font-bold text-error mb-2">Invalid Records</h4>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {analysisResult.invalid.map((record: any, index: number) => (
                                            <p key={index} className="text-sm text-text-secondary">{record.reason}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysisResult.duplicates.length > 0 && (
                                <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-warning">Duplicate Records - Choose Action</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => setAllDuplicates('update')} className="text-xs px-3 py-1 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                                Update All
                                            </button>
                                            <button onClick={() => setAllDuplicates('skip')} className="text-xs px-3 py-1 bg-error/10 text-error rounded border border-error/20 hover:bg-error hover:text-white transition-all">
                                                Skip All
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {analysisResult.duplicates.map((record: any, index: number) => (
                                            <div key={index} className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-text">
                                                        {entityType === 'products' ? record.sku : entityType === 'users' ? record.email : record.name}
                                                    </p>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                        <p className="text-[10px] text-text-secondary uppercase tracking-tight">
                                                            Added By: <span className="font-bold text-text">{record.existing.created_by_name || 'System'}</span> on {new Date(record.existing.created_at).toLocaleDateString()}
                                                        </p>
                                                        {record.existing.updated_at && (
                                                            <p className="text-[10px] text-text-secondary uppercase tracking-tight">
                                                                Last Updated By: <span className="font-bold text-text">{record.existing.updated_by_name || 'N/A'}</span> on {new Date(record.existing.updated_at).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={duplicateChoices[index] === 'update'}
                                                        onChange={() => toggleDuplicateChoice(index)}
                                                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                                                    />
                                                    <span className="text-sm font-bold text-text">Update</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button onClick={handleClose} disabled={isUploading} className="px-5 py-2.5 text-text-secondary font-bold hover:text-text disabled:opacity-50 transition-colors text-sm uppercase">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isUploading || (analysisResult.valid.length === 0 && Object.values(duplicateChoices).filter(c => c === 'update').length === 0)}
                                    className="px-6 py-2.5 bg-success hover:bg-success/90 text-white font-black rounded-xl shadow-lg shadow-success/25 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-wide"
                                >
                                    {isUploading ? 'Importing...' : `Import ${analysisResult.valid.length + Object.values(duplicateChoices).filter(c => c === 'update').length} Records`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export const exportToCSV = (data: any[], filename: string) => {
    if (typeof window === 'undefined' || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) val = '';
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToPDF = async (data: any[], filename: string, title: string) => {
    if (typeof window === 'undefined' || data.length === 0) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const headers = Object.keys(data[0]).map(h => h.toUpperCase().replace(/_/g, ' '));
    const rows = data.map(row => Object.values(row).map(v => v === null ? '' : String(v)));

    // Smart orientation: Use landscape if we have more than 5 columns
    const orientation = headers.length > 5 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation });

    doc.setFontSize(18);
    doc.setTextColor(40, 44, 52);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        theme: 'grid',
        styles: {
            fontSize: 8, // Slightly smaller font for better fit
            cellPadding: 4, // Tighter padding
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            valign: 'middle',
            textColor: [50, 50, 50],
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [60, 50, 200],
            minCellWidth: 20 // Attempt to force minimum width for headers
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        },
        // Ensure full width use
        margin: { top: 35, left: 10, right: 10 }
    });

    doc.save(`${filename}.pdf`);
};

export const generateInvoicePDF = async (orderItems: any[]) => {
    if (typeof window === 'undefined' || orderItems.length === 0) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const firstOrder = orderItems[0];
    const date = new Date(firstOrder.created_at).toLocaleDateString();
    const pageWidth = doc.internal.pageSize.width;

    // Colors
    const primaryColor: [number, number, number] = [79, 70, 229]; // Primary purple
    const secondaryColor: [number, number, number] = [100, 100, 100]; // Gray
    const lightGray: [number, number, number] = [245, 247, 250];

    // ===== HEADER SECTION =====
    // Company Logo Placeholder (you can replace this with actual logo)
    doc.setFillColor(...primaryColor);
    doc.circle(20, 20, 8, 'F'); // Logo placeholder circle
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('AI', 20, 22, { align: 'center' });

    // Company Name and Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI INVENTORY SYSTEM', 35, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('123 Business Street, Tech City, TC 12345', 35, 24);
    doc.text('Phone: +1 (555) 123-4567 | Email: info@aiinventory.com', 35, 29);

    // Invoice Title and Number (Right Side)
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('INVOICE', pageWidth - 20, 18, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`#${firstOrder.order_code || 'N/A'}`, pageWidth - 20, 26, { align: 'right' });

    // Horizontal line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);

    // ===== BILL TO & INVOICE DETAILS =====
    let yPos = 45;

    // Bill To Section (Left)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('BILL TO:', 20, yPos);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(firstOrder.user_name || firstOrder.placed_by || 'Valued Customer', 20, yPos + 6);
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(9);
    doc.text(`Customer ID: ${firstOrder.user_id || 'N/A'}`, 20, yPos + 11);
    doc.text(`Email: customer@example.com`, 20, yPos + 16);

    // Invoice Details (Right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    const detailsX = pageWidth - 70;
    doc.text('Invoice Date:', detailsX, yPos);
    doc.text('Status:', detailsX, yPos + 5);
    doc.text('Payment Method:', detailsX, yPos + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(date, detailsX + 35, yPos);

    // Status with color
    const status = firstOrder.status.toUpperCase();
    if (status === 'COMPLETED') {
        doc.setTextColor(34, 197, 94); // Green
    } else if (status === 'PENDING') {
        doc.setTextColor(234, 179, 8); // Yellow
    } else {
        doc.setTextColor(239, 68, 68); // Red
    }
    doc.text(status, detailsX + 35, yPos + 5);

    doc.setTextColor(0, 0, 0);
    doc.text(firstOrder.payment_method || 'Cash', detailsX + 35, yPos + 10);

    yPos += 30;

    // ===== ITEMS TABLE =====
    const tableBody = orderItems.map(item => [
        item.product_name,
        item.quantity.toString(),
        `$${(item.total_amount / item.quantity).toFixed(2)}`,
        `$${parseFloat(item.total_amount).toFixed(2)}`
    ]);

    autoTable(doc, {
        head: [['PRODUCT DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
        body: tableBody,
        startY: yPos,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
            lineColor: [60, 50, 200],
            lineWidth: 0.1
        },
        styles: {
            fontSize: 9,
            cellPadding: 5,
            lineColor: [200, 200, 200], // Explicit border color
            lineWidth: 0.1, // Explicit border width
            textColor: [50, 50, 50]
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
        },
        alternateRowStyles: {
            fillColor: lightGray
        }
    });

    // ===== TOTALS SECTION =====
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalsX = pageWidth - 75;

    const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('Subtotal:', totalsX, finalY);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' });

    // Tax
    doc.setTextColor(...secondaryColor);
    doc.text('Tax (10%):', totalsX, finalY + 6);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${tax.toFixed(2)}`, pageWidth - 20, finalY + 6, { align: 'right' });

    // Line above total
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.3);
    doc.line(totalsX, finalY + 9, pageWidth - 20, finalY + 9);

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL:', totalsX, finalY + 15);
    doc.text(`$${total.toFixed(2)}`, pageWidth - 20, finalY + 15, { align: 'right' });

    // ===== PAYMENT TERMS & NOTES =====
    const notesY = finalY + 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Terms:', 20, notesY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('Payment is due within 30 days. Please include invoice number with payment.', 20, notesY + 5);

    // ===== FOOTER =====
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' });
    doc.text('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, 285, { align: 'center' });

    doc.save(`Invoice_${firstOrder.order_code || firstOrder.id}.pdf`);
};

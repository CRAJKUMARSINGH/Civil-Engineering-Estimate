"""
Export functions for Excel and PDF reports
"""
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)


def export_excel(boq_dict, rates, rates_full, cost_summary, file_name):
    """Export BOQ to Excel with formatting"""
    rows = []
    for code, qty in boq_dict.items():
        rate = rates.get(code, 0)
        amount = qty * rate
        
        # Get description and unit from full rates
        if code in rates_full.index:
            desc = rates_full.loc[code, 'description']
            unit = rates_full.loc[code, 'unit']
        else:
            desc = code
            unit = 'unit'
        
        rows.append([code, desc, unit, qty, rate, amount])
    
    df = pd.DataFrame(rows, columns=['Item Code', 'Description', 'Unit', 'Quantity', 'Rate (₹)', 'Amount (₹)'])
    
    # Add summary rows
    summary_rows = pd.DataFrame([
        ['', '', '', '', 'Net Cost:', cost_summary['net_cost']],
        ['', '', '', '', 'Overhead (8%):', cost_summary['overhead']],
        ['', '', '', '', 'Contingency (10%):', cost_summary['contingency']],
        ['', '', '', '', 'GST (18%):', cost_summary['gst']],
        ['', '', '', '', 'Grand Total:', cost_summary['grand_total']]
    ], columns=df.columns)
    
    df = pd.concat([df, summary_rows], ignore_index=True)
    df.to_excel(file_name, index=False, sheet_name='BOQ')


def export_pdf(boq_dict, rates, rates_full, cost_summary, file_name):
    """Export BOQ to PDF"""
    doc = SimpleDocTemplate(file_name, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    story.append(Paragraph("Bridge Estimate Summary", styles['Title']))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Rajasthan SSR 2024", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # BOQ Table
    data = [['Item Code', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)']]
    
    for code, qty in boq_dict.items():
        rate = rates.get(code, 0)
        amount = qty * rate
        
        if code in rates_full.index:
            desc = rates_full.loc[code, 'description']
            unit = rates_full.loc[code, 'unit']
        else:
            desc = code
            unit = 'unit'
        
        data.append([
            code,
            desc[:30],  # Truncate long descriptions
            unit,
            f"{qty:.3f}",
            f"{rate:,.0f}",
            f"{amount:,.0f}"
        ])
    
    # Add summary
    data.append(['', '', '', '', '', ''])
    data.append(['', '', '', '', 'Net Cost:', f"₹{cost_summary['net_cost']:,.0f}"])
    data.append(['', '', '', '', 'Overhead:', f"₹{cost_summary['overhead']:,.0f}"])
    data.append(['', '', '', '', 'Contingency:', f"₹{cost_summary['contingency']:,.0f}"])
    data.append(['', '', '', '', 'GST:', f"₹{cost_summary['gst']:,.0f}"])
    data.append(['', '', '', '', 'Grand Total:', f"₹{cost_summary['grand_total']:,.0f}"])
    
    t = Table(data, colWidths=[60, 150, 40, 50, 70, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -6), colors.beige),
        ('GRID', (0, 0), (-1, -6), 1, colors.black),
        ('FONTNAME', (0, -5), (-1, -1), 'Helvetica-Bold'),
        ('ALIGN', (4, -5), (-1, -1), 'RIGHT'),
    ]))
    
    story.append(t)
    doc.build(story)

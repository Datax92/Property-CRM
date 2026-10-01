'use client';

import React from 'react';
import { LogoMark, Icon } from './Icons';
import * as M from '../lib/re-data';
import type { Invoice } from '../lib/types';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  numbers?: 'cr' | 'm' | 'full';
}

export function InvoiceReceiptModal({ invoice, onClose, numbers = 'full' }: Props) {
  if (!invoice) return null;

  const isSale = invoice.type === 'sale';
  const title = isSale ? 'SALE INVOICE & RECEIPT' : 'PURCHASE INVOICE & RECEIPT';
  const subtitle = isSale
    ? 'Official Customer Receipt — Sale Proof Copy'
    : 'Internal Company Record — Purchase Audit Copy';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div
        className="receipt-modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action bar (hidden in print) */}
        <div className="receipt-modal-actions" data-noprint="1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`tag ${isSale ? 'ok' : 'mute'}`}>
              {isSale ? 'Sale Invoice' : 'Purchase Invoice'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
              ID: {invoice.id} · Sr No. {invoice.srNo}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn pri" onClick={handlePrint}>
              <Icon name="print" /> Print Voucher / PDF
            </button>
            <button type="button" className="btn" onClick={onClose}>
              <Icon name="x" /> Close
            </button>
          </div>
        </div>

        {/* Printable Voucher Slip */}
        <div className="printable-voucher">
          {/* Voucher Header */}
          <div className="voucher-header">
            <div className="voucher-brand">
              <LogoMark />
              <div>
                <h2>{M.COMPANY}</h2>
                <span>Real Estate Investment &amp; Property Management</span>
              </div>
            </div>
            <div className="voucher-doc-meta">
              <div className="voucher-badge">{title}</div>
              <div className="voucher-copy-type">{subtitle}</div>
              <div className="voucher-meta-row">
                <span>Receipt No:</span>
                <b>{invoice.id} (Sr #{invoice.srNo})</b>
              </div>
              <div className="voucher-meta-row">
                <span>Receipt Date:</span>
                <b>{M.fmtDate(invoice.receiptDate)}</b>
              </div>
            </div>
          </div>

          <div className="voucher-divider" />

          {/* Parties & Transaction Info */}
          <div className="voucher-grid-2">
            <div className="voucher-box">
              <div className="voucher-box-title">Buyer Information</div>
              <table className="voucher-table-mini">
                <tbody>
                  <tr>
                    <td>Buyer Name:</td>
                    <td><b>{invoice.buyerName || '—'}</b></td>
                  </tr>
                  <tr>
                    <td>Company:</td>
                    <td>{invoice.buyerCompany || 'Individual'}</td>
                  </tr>
                  <tr>
                    <td>CNIC No:</td>
                    <td><b className="mono">{invoice.buyerCnic || '—'}</b></td>
                  </tr>
                  <tr>
                    <td>Buyer Bank Details:</td>
                    <td>{invoice.bankDetailsBuyer || 'Cash / Transfer'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="voucher-box">
              <div className="voucher-box-title">Property &amp; Transaction Details</div>
              <table className="voucher-table-mini">
                <tbody>
                  <tr>
                    <td>Property:</td>
                    <td><b>{invoice.propertyName || '—'}</b></td>
                  </tr>
                  <tr>
                    <td>Payment Date:</td>
                    <td>{invoice.paymentDate ? M.fmtDate(invoice.paymentDate) : M.fmtDate(invoice.receiptDate)}</td>
                  </tr>
                  <tr>
                    <td>Seller Bank Details:</td>
                    <td>{invoice.bankDetailsSeller || 'Direct / Bank Account'}</td>
                  </tr>
                  <tr>
                    <td>Transfer Date:</td>
                    <td>{invoice.transferDate ? M.fmtDate(invoice.transferDate) : 'Pending Schedule'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="voucher-financials">
            <div className="voucher-box-title">Financial Settlement Breakdown</div>
            <table className="voucher-table-main">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Payment Milestone</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Total Property Agreed Price</b></td>
                  <td>Contract / Land Basis Value</td>
                  <td>—</td>
                  <td className="r mono"><b>{M.fmt(invoice.totalAmount, numbers)}</b></td>
                </tr>
                <tr>
                  <td>
                    <b>Token / Advance Amount Paid</b>
                    <div style={{ fontSize: '11px', color: '#555' }}>Initial earnest payment receipt</div>
                  </td>
                  <td>Advance / Token</td>
                  <td className="mono">{invoice.tokenDate ? M.fmtDate(invoice.tokenDate) : M.fmtDate(invoice.receiptDate)}</td>
                  <td className="r mono" style={{ color: '#097969', fontWeight: 700 }}>
                    {M.fmt(invoice.tokenAmount, numbers)}
                  </td>
                </tr>
                <tr className="voucher-tot-row">
                  <td colSpan={3}><b>Net Remaining Balance Due</b></td>
                  <td className="r mono" style={{ color: invoice.balanceAmount > 0 ? '#b02a37' : '#000', fontWeight: 800 }}>
                    {M.fmt(invoice.balanceAmount, numbers)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Terms & Notes */}
          <div className="voucher-notes">
            <b>Terms &amp; Acknowledgement:</b>
            <p>
              1. This voucher is an official receipt of payment for the transaction noted above.
              <br />
              2. Payments made via cheque, pay order or online transfer are subject to banking realization.
              <br />
              3. Final title transfer or possession is contingent upon full clearance of the outstanding balance.
              {invoice.notes && (
                <>
                  <br />
                  <b>Notes:</b> {invoice.notes}
                </>
              )}
            </p>
          </div>

          {/* Signature & Stamp Boxes */}
          <div className="voucher-signatures">
            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-name"><b>{invoice.receivedFromName || 'Payer / Buyer'}</b></div>
              <div className="sig-title">Received From (CNIC: {invoice.receivedFromCnic || '—'})</div>
            </div>

            <div className="sig-stamp-space">
              <div className="stamp-box">Official Stamp</div>
            </div>

            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-name"><b>{invoice.receivedByName || 'Authorized Officer'}</b></div>
              <div className="sig-title">Received By (CNIC: {invoice.receivedByCnic || '—'})</div>
            </div>
          </div>

          <div className="voucher-footer">
            <span>Generated electronically by Meridian Estates RMS</span>
            <span>Date: {M.fmtDate(M.TODAY)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/export/BOMTable.tsx
import type { ExportBOMData } from '../../types/export'
import './export.css'


interface Props { bom: ExportBOMData }

const SOURCE_LABEL: Record<string, string> = {
    aliexpress: 'AliExpress',
    amazon: 'Amzon',
    printed: '3D Print',
}





export default function BOMTable({ bom }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>

      {/* Cost hero card */}
      <div className="exp-card">
        <div className="exp-card-title">Estimated Build Cost</div>
        <div className="exp-cost">
          <span className="exp-cost-value">${bom.total_usd.toFixed(2)}</span>
          <span className="exp-cost-unit">USD</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.5, margin: 0 }}>
          {bom.note}
        </p>
      </div>

      {/* Parts table */}
      <div className="exp-card" style={{ overflowX: 'auto' }}>
        <div className="exp-card-title">Parts List</div>
        <table className="exp-bom-table">
          <thead>
            <tr>
              <th>Component</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit $</th>
              <th style={{ textAlign: 'right' }}>Total $</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {bom.items.map((item, i) => (
              <tr key={i}>
                <td>{item.component}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {item.qty}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {item.unit_usd.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {item.total_usd.toFixed(2)}
                </td>
                <td>
                  <span className="exp-bom-source">
                    {SOURCE_LABEL[item.source] ?? item.source}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={3}>TOTAL</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {bom.total_usd.toFixed(2)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
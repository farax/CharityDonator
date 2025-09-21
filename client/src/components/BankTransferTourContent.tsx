export default function BankTransferTourContent() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ 
        marginBottom: '12px', 
        paddingBottom: '8px', 
        borderBottom: '2px solid #0d9488' 
      }}>
        <h3 style={{ 
          margin: '0',
          fontSize: '18px', 
          fontWeight: '700', 
          color: '#0d9488'
        }}>
          🏦 New Feature: Bank Transfer
        </h3>
      </div>
      
      <p style={{ 
        margin: '0 0 12px 0', 
        fontSize: '15px', 
        fontWeight: '500',
        color: '#374151',
        lineHeight: '1.4'
      }}>
        Donate directly from your bank — no fees, no limits.
      </p>
      
      <div style={{ marginBottom: '12px' }}>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px', 
          fontWeight: '600',
          color: '#6b7280'
        }}>
          Perfect for:
        </p>
        <ul style={{ 
          margin: '0', 
          padding: '0 0 0 16px',
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.5'
        }}>
          <li style={{ marginBottom: '4px' }}>Large donations (bypass card limits)</li>
          <li style={{ marginBottom: '4px' }}>Instant PayID transfers</li>
          <li style={{ marginBottom: '4px' }}>Simple, direct payments</li>
        </ul>
      </div>
      
      <div style={{ 
        marginTop: '16px',
        padding: '8px 12px',
        backgroundColor: '#f0fdfa',
        borderRadius: '6px',
        border: '1px solid #5eead4'
      }}>
        <p style={{ 
          margin: '0',
          fontSize: '13px', 
          color: '#0d9488',
          fontWeight: '500'
        }}>
          💡 Click the banner below to see bank details
        </p>
      </div>
    </div>
  );
}
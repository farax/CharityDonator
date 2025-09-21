import { Step } from 'react-joyride';

// Define your feature tours here
export const useFeatureTours = () => {
  const features = [
    {
      id: 'bank_transfer',
      version: '1.0.0', // Increment this to show tour again
      steps: [
        {
          target: '[data-testid="button-bank-transfer-toggle"]',
          content: `
            <div style="font-family: system-ui, -apple-system, sans-serif;">
              <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #0d9488;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #0d9488;">
                  🏦 New Feature: Bank Transfer
                </h3>
              </div>
              
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #374151; line-height: 1.4;">
                Donate directly from your bank — no fees, no limits.
              </p>
              
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #6b7280;">
                  Perfect for:
                </p>
                <ul style="margin: 0; padding: 0 0 0 16px; font-size: 14px; color: #374151; line-height: 1.5;">
                  <li style="margin-bottom: 4px;">Large donations (bypass card limits)</li>
                  <li style="margin-bottom: 4px;">Instant PayID transfers</li>
                  <li style="margin-bottom: 4px;">Simple, direct payments</li>
                </ul>
              </div>
              
              <div style="margin-top: 16px; padding: 8px 12px; background-color: #f0fdfa; border-radius: 6px; border: 1px solid #5eead4;">
                <p style="margin: 0; font-size: 13px; color: #0d9488; font-weight: 500;">
                  💡 Click the banner below to see bank details
                </p>
              </div>
            </div>
          `,
          placement: 'top',
          disableBeacon: true,
          styles: {
            tooltip: {
              width: 320,
            },
          },
        },
      ] as Step[],
    },
    // Add more features here in the future:
    // {
    //   id: 'another_feature',
    //   version: '1.0.0',
    //   steps: [...]
    // }
  ];

  return { features };
};
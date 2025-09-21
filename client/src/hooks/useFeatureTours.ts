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
            <div>
              <h3 style="font-size: 1.125rem; font-weight: bold; margin-bottom: 0.5rem;">🏦 New Feature: Bank Transfer</h3>
              <p style="margin-bottom: 0.5rem;">
                You can now donate via direct bank transfer! This is perfect for:
              </p>
              <ul style="list-style-type: disc; list-style-position: inside; margin-left: 1rem;">
                <li>Large donations (no card limits)</li>
                <li>Fee-free transfers using PayID</li>
                <li>Direct from your bank account</li>
              </ul>
              <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                Click the banner below to see your bank details.
              </p>
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
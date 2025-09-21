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
          content: `🏦 New Feature: Bank Transfer

You can now donate via direct bank transfer! This is perfect for:

• Large donations (no card limits)
• Fee-free transfers using PayID  
• Direct from your bank account

Click the banner below to see your bank details.`,
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
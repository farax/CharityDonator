import { Step } from 'react-joyride';
import { createElement } from 'react';
import BankTransferTourContent from '@/components/BankTransferTourContent';

// Define your feature tours here
export const useFeatureTours = () => {
  const features = [
    {
      id: 'bank_transfer',
      version: '1.0.0', // Increment this to show tour again
      steps: [
        {
          target: '[data-testid="button-bank-transfer-toggle"]',
          content: createElement(BankTransferTourContent),
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
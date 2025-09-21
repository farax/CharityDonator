import { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';

interface FeatureTourProps {
  features: {
    id: string;
    version: string;
    steps: Step[];
  }[];
  children: React.ReactNode;
}

export default function FeatureTour({ features, children }: FeatureTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<Step[]>([]);
  const [tourKey, setTourKey] = useState(0);

  // Check which features are new for this user
  useEffect(() => {
    const checkForNewFeatures = () => {
      const newSteps: Step[] = [];
      
      features.forEach(feature => {
        const seenVersion = localStorage.getItem(`feature_${feature.id}_seen`);
        
        // If user hasn't seen this version of the feature, show the tour
        if (!seenVersion || seenVersion !== feature.version) {
          newSteps.push(...feature.steps);
        }
      });

      if (newSteps.length > 0) {
        setCurrentSteps(newSteps);
        // Small delay to ensure DOM elements are ready
        setTimeout(() => setRunTour(true), 1000);
      }
    };

    checkForNewFeatures();
  }, [features]);

  const handleJoyrideCallback = (data: any) => {
    const { action, status, type, index } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Mark all features as seen when tour is finished or skipped
      features.forEach(feature => {
        localStorage.setItem(`feature_${feature.id}_seen`, feature.version);
      });
      setRunTour(false);
      setCurrentSteps([]);
    }
    
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      // Mark individual features as seen when user progresses through steps
      const currentStep = currentSteps[index];
      if (currentStep?.target) {
        // Find which feature this step belongs to
        features.forEach(feature => {
          const stepExists = feature.steps.some(step => step.target === currentStep.target);
          if (stepExists) {
            localStorage.setItem(`feature_${feature.id}_seen`, feature.version);
          }
        });
      }
    }
  };

  // Development/Testing functions
  const resetAllFeatures = () => {
    features.forEach(feature => {
      localStorage.removeItem(`feature_${feature.id}_seen`);
    });
    setTourKey(prev => prev + 1); // Force re-render
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const startTourManually = () => {
    if (currentSteps.length === 0) {
      // If no new features, show all features for testing
      const allSteps = features.flatMap(f => f.steps);
      setCurrentSteps(allSteps);
    }
    setRunTour(true);
  };

  // Add development controls (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Add global functions for testing
      (window as any).resetFeatureTours = resetAllFeatures;
      (window as any).startFeatureTour = startTourManually;
      
      console.log('🎯 Feature Tour Controls:');
      console.log('- resetFeatureTours() - Clear all seen features');
      console.log('- startFeatureTour() - Manually start tour');
    }
  }, []);

  return (
    <>
      <Joyride
        key={tourKey}
        steps={currentSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#0d9488', // Your teal primary color
            textColor: '#374151',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.4)',
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
          spotlight: {
            borderRadius: 8,
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip tour',
        }}
      />
      {children}
    </>
  );
}
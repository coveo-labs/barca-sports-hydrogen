import {Button} from '@headlessui/react';
import {
  BrainIcon,
  CheckIcon,
  SpeechIcon,
  StepForwardIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  ZapIcon,
} from 'lucide-react';
import type {DetectIntentResponse} from '~/routes/detect-intent';
import {LoadingDots} from './LoadingDots';

export const LoadingIntentDetection = () => {
  return (
    <div className="p-4 text-xl flex items-center">
      <BrainIcon className="w-8 text-dark mr-4 text-indigo-600" />
      <LoadingDots loadingText={['Thinking', 'Analyzing']} />
    </div>
  );
};

const IntentDetectStep = ({
  icn: Icon,
  intentAccepted,
  title,
  value,
  children,
}: {
  icn: any;
  intentAccepted: boolean;
  title: string;
  value: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className={`flex items-center py-4 ${intentAccepted ? 'py-2' : ''}`}>
      <Icon className={`w-8 text-dark mr-4 text-indigo-600`} />
      <div>
        <p
          className={`text-indigo-600 ${intentAccepted ? 'hidden' : 'text-lg'}`}
        >
          {title}
        </p>
        <p className={`${intentAccepted ? 'text-xs' : 'text-md'}`}>{value}</p>
        {children}
      </div>
    </div>
  );
};

export const IntentDetectionSteps = ({
  intentAccepted,
  intentDetection,
  onAcceptIntent,
  onRefuseIntent,
}: {
  intentAccepted: boolean;
  intentDetection: DetectIntentResponse;
  onAcceptIntent: () => void;
  onRefuseIntent: () => void;
}) => {
  return (
    <div
      className={`divide-y p-4 transition-all ${intentAccepted ? 'py-0' : ''}`}
    >
      <IntentDetectStep
        icn={ZapIcon}
        title="Intent detection"
        value={intentDetection.output.reason}
        intentAccepted={intentAccepted}
      />
      <IntentDetectStep
        icn={SpeechIcon}
        title="Reformulated input"
        value={intentDetection.output.expandedOrReformulatedQuery}
        intentAccepted={intentAccepted}
      />
      <IntentDetectStep
        icn={intentAccepted ? CheckIcon : StepForwardIcon}
        value={intentDetection.output.intentHumanReadable}
        title="Next step"
        intentAccepted={intentAccepted}
      >
        <div className="flex gap-4">
          <Button
            onClick={onAcceptIntent}
            className={`mt-6 flex items-center rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              intentAccepted ? 'opacity-50 text-xs mt-2' : ''
            }`}
          >
            <ThumbsUpIcon className="mr-4" /> OK !
          </Button>
          <Button
            onClick={onRefuseIntent}
            className={`mt-6 flex items-center rounded-md px-3 py-3 border text-sm font-semibold shadow-sm hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              intentAccepted ? 'hidden' : ''
            }`}
          >
            <ThumbsDownIcon className="mr-4" />
            No, just let me search on my own
          </Button>
        </div>
      </IntentDetectStep>
    </div>
  );
};

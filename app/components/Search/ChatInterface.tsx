import React from 'react';
import {Answer} from '../Generative/Answer';
import type {TroubleshootResponse} from '~/routes/troubleshoot';
import {LoadingDots} from './LoadingDots';

interface ChatInterfaceProps {
  response: TroubleshootResponse;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({response}) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <Answer text={response.output.answer} />
      </div>
      {response.output.followupQuestions.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold">Follow-up Questions:</h4>
          <ul className="list-disc pl-5 space-y-2">
            {response.output.followupQuestions.map((question, index) => (
              <li key={index} className="text-gray-700">
                <p>{question}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <form action="#" className="relative flex-auto">
              <div className="flex items-center pb-12">
                <label htmlFor="answer" className="sr-only">
                  Add your answer
                </label>
                <textarea
                  id="answer"
                  name="answer"
                  rows={1}
                  placeholder="Add your answer..."
                  className="block w-full resize-none bg-gray-100 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  defaultValue={''}
                />
                <button
                  type="submit"
                  className="ml-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoadingChatInterface = () => {
  return (
    <div className="p-4 text-xl flex items-center">
      <LoadingDots
        loadingText={[
          'Analyzing query',
          'Finding relevant passages',
          'Generating answer',
          'Troubleshooting',
        ]}
      />
    </div>
  );
};

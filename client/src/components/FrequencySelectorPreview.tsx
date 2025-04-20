import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FrequencyType = 'one-off' | 'weekly' | 'monthly';

export default function FrequencySelectorPreview() {
  const [option1Value, setOption1Value] = useState<FrequencyType>('one-off');
  const [option2Value, setOption2Value] = useState<FrequencyType>('one-off');
  const [option3Value, setOption3Value] = useState<FrequencyType>('one-off');
  const [option4Value, setOption4Value] = useState<FrequencyType>('one-off');
  const [option5Value, setOption5Value] = useState<FrequencyType>('one-off');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Payment Frequency Selector Options</h1>
      
      <div className="grid gap-8">
        {/* Option 1: Segmented Toggle Button */}
        <Card>
          <CardHeader>
            <CardTitle>Option 1: Segmented Toggle Button</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  option1Value === 'one-off'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300 rounded-l-lg focus:z-10 focus:ring-2 focus:ring-primary`}
                onClick={() => setOption1Value('one-off')}
              >
                One-off
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  option1Value === 'weekly'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border-t border-b border-gray-300 focus:z-10 focus:ring-2 focus:ring-primary`}
                onClick={() => setOption1Value('weekly')}
              >
                Weekly
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  option1Value === 'monthly'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300 rounded-r-lg focus:z-10 focus:ring-2 focus:ring-primary`}
                onClick={() => setOption1Value('monthly')}
              >
                Monthly
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-semibold">{option1Value}</span>
            </div>
          </CardContent>
        </Card>

        {/* Option 2: Radio Cards with Icons */}
        <Card>
          <CardHeader>
            <CardTitle>Option 2: Radio Cards with Icons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`rounded-lg border p-3 cursor-pointer text-center transition-all ${
                  option2Value === 'one-off'
                    ? 'border-primary bg-primary-50 ring-2 ring-primary'
                    : 'border-gray-200 hover:border-primary hover:bg-primary-50'
                }`}
                onClick={() => setOption2Value('one-off')}
              >
                <div className="flex justify-center mb-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-medium">One-off</span>
              </div>
              
              <div
                className={`rounded-lg border p-3 cursor-pointer text-center transition-all ${
                  option2Value === 'weekly'
                    ? 'border-primary bg-primary-50 ring-2 ring-primary'
                    : 'border-gray-200 hover:border-primary hover:bg-primary-50'
                }`}
                onClick={() => setOption2Value('weekly')}
              >
                <div className="flex justify-center mb-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-medium">Weekly</span>
              </div>
              
              <div
                className={`rounded-lg border p-3 cursor-pointer text-center transition-all ${
                  option2Value === 'monthly'
                    ? 'border-primary bg-primary-50 ring-2 ring-primary'
                    : 'border-gray-200 hover:border-primary hover:bg-primary-50'
                }`}
                onClick={() => setOption2Value('monthly')}
              >
                <div className="flex justify-center mb-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10 14h4M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-medium">Monthly</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-semibold">{option2Value}</span>
            </div>
          </CardContent>
        </Card>

        {/* Option 3: ShadCN Tabs Component */}
        <Card>
          <CardHeader>
            <CardTitle>Option 3: ShadCN Tabs Component</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={option3Value} 
              onValueChange={(value) => setOption3Value(value as FrequencyType)}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="one-off">One-off</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-semibold">{option3Value}</span>
            </div>
          </CardContent>
        </Card>

        {/* Option 4: Radio Group with Clear Labels */}
        <Card>
          <CardHeader>
            <CardTitle>Option 4: Radio Group with Clear Labels</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={option4Value} 
              onValueChange={(value) => setOption4Value(value as FrequencyType)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one-off" id="one-off" />
                <Label htmlFor="one-off" className="cursor-pointer">One-off</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
              </div>
            </RadioGroup>
            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-semibold">{option4Value}</span>
            </div>
          </CardContent>
        </Card>

        {/* Option 5: Select Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>Option 5: Select Dropdown (Space-Efficient)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={option5Value} 
              onValueChange={(value) => setOption5Value(value as FrequencyType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-off">One-time donation</SelectItem>
                <SelectItem value="weekly">Weekly recurring</SelectItem>
                <SelectItem value="monthly">Monthly recurring</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-semibold">{option5Value}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
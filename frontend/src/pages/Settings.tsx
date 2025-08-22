import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useConfigStore } from '../stores/config';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import toast from 'react-hot-toast';

const configSchema = z.object({
  autoCloseEnabled: z.boolean(),
  confidenceThreshold: z.number().min(0).max(1),
  slaHours: z.number().min(1),
});

type ConfigForm = z.infer<typeof configSchema>;

export const Settings: React.FC = () => {
  const { config, isLoading, fetchConfig, updateConfig } = useConfigStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
  });

  const confidenceThreshold = watch('confidenceThreshold');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        await fetchConfig();
      } catch (error) {
        toast.error('Failed to load settings');
      }
    };
    loadConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      reset(config);
    }
  }, [config, reset]);

  const onSubmit = async (data: ConfigForm) => {
    try {
      await updateConfig(data);
      toast.success('Settings updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    }
  };

  if (isLoading && !config) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card>
          <CardContent className="p-6">
            <LoadingSkeleton lines={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Auto-Close Settings
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('autoCloseEnabled')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  Enable automatic ticket closure when AI confidence is high
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Confidence Threshold ({Math.round((confidenceThreshold || 0) * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                {...register('confidenceThreshold', { valueAsNumber: true })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-500">
                Minimum confidence level required for AI actions
              </p>
              {errors.confidenceThreshold && (
                <p className="text-sm text-red-600">{errors.confidenceThreshold.message}</p>
              )}
            </div>

            <Input
              {...register('slaHours', { valueAsNumber: true })}
              type="number"
              label="SLA Hours"
              placeholder="Enter SLA hours"
              error={errors.slaHours?.message}
            />

            <Button
              type="submit"
              isLoading={isLoading}
            >
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
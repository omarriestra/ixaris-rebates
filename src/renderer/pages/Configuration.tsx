import React, { useState, useEffect } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { AppConfiguration, FileValidationResult } from '../../shared/types';

export const Configuration: React.FC = () => {
  const { configuration, saveConfiguration, isLoading, error } = useConfiguration();
  const { showNotification } = useNotification();
  
  const [formData, setFormData] = useState<AppConfiguration>({
    folderPath: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load current configuration
  useEffect(() => {
    if (configuration) {
      setFormData(configuration);
    }
  }, [configuration]);

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - 5 + i;
    return { value: year, label: year.toString() };
  });

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'long' });
    return { value: month, label: `${month.toString().padStart(2, '0')} - ${monthName}` };
  });

  const handleFolderSelect = async () => {
    try {
      const result = await window.electronAPI.file.selectDataFolder();
      if (result) {
        setFormData(prev => ({ ...prev, folderPath: result }));
        setFormErrors(prev => ({ ...prev, folderPath: '' }));
        await validateFiles(result, formData.year, formData.month);
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to select folder. Please try again.',
      });
    }
  };

  const validateFiles = async (folderPath: string, year: number, month: number) => {
    if (!folderPath) return;
    
    setValidating(true);
    try {
      const result = await window.electronAPI.file.validateFiles(folderPath, year, month);
      setValidation(result);
    } catch (err) {
      console.error('Error validating files:', err);
      setValidation({
        isValid: false,
        foundFiles: [],
        missingFiles: [],
        errors: ['Failed to validate files'],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleInputChange = (field: keyof AppConfiguration, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
    
    // Re-validate files when year or month changes
    if ((field === 'year' || field === 'month') && formData.folderPath) {
      const newFormData = { ...formData, [field]: value };
      validateFiles(formData.folderPath, newFormData.year, newFormData.month);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.folderPath) {
      errors.folderPath = 'Please select a data folder';
    }
    
    if (!formData.year || formData.year < 2020 || formData.year > 2030) {
      errors.year = 'Please select a valid year';
    }
    
    if (!formData.month || formData.month < 1 || formData.month > 12) {
      errors.month = 'Please select a valid month';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await saveConfiguration(formData);
      showNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Your configuration has been saved successfully.',
      });
    } catch (err) {
      console.error('Error saving configuration:', err);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save configuration. Please try again.',
      });
    }
  };

  const getValidationStatusBadge = () => {
    if (validating) {
      return <Badge variant="warning">Validating...</Badge>;
    }
    
    if (!validation) {
      return <Badge variant="default">No validation</Badge>;
    }
    
    if (validation.isValid) {
      return <Badge variant="success">Valid</Badge>;
    }
    
    return <Badge variant="error">Invalid</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <p className="text-gray-600 mt-2">
          Configure your data folder and processing parameters for rebate calculations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <Card>
          <CardHeader
            title="Processing Configuration"
            subtitle="Set up your data source and processing parameters"
          />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Folder
                </label>
                <div className="flex gap-3">
                  <Input
                    value={formData.folderPath}
                    placeholder="Select a folder containing your data files"
                    readOnly
                    className="flex-1"
                    error={formErrors.folderPath}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFolderSelect}
                    disabled={isLoading}
                  >
                    Browse
                  </Button>
                </div>
                {formErrors.folderPath && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.folderPath}</p>
                )}
              </div>

              {/* Year Selection */}
              <Select
                label="Year"
                value={formData.year}
                onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                options={yearOptions}
                error={formErrors.year}
              />

              {/* Month Selection */}
              <Select
                label="Month"
                value={formData.month}
                onChange={(e) => handleInputChange('month', parseInt(e.target.value))}
                options={monthOptions}
                error={formErrors.month}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                disabled={!validation?.isValid}
              >
                Save Configuration
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* File Validation Status */}
        <Card>
          <CardHeader
            title="File Validation"
            subtitle="Status of required files in the selected folder"
            action={getValidationStatusBadge()}
          />
          <CardContent>
            {validating && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-3 text-gray-600">Validating files...</span>
              </div>
            )}

            {!validating && !validation && (
              <div className="text-center py-8">
                <p className="text-gray-500">Select a folder to validate files</p>
              </div>
            )}

            {!validating && validation && (
              <div className="space-y-4">
                {/* Found Files */}
                {validation.foundFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      Found Files ({validation.foundFiles.length})
                    </h4>
                    <div className="space-y-1">
                      {validation.foundFiles.map((file) => (
                        <div key={file} className="flex items-center text-sm">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-900">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Files */}
                {validation.missingFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-800 mb-2">
                      Missing Files ({validation.missingFiles.length})
                    </h4>
                    <div className="space-y-1">
                      {validation.missingFiles.map((file) => (
                        <div key={file} className="flex items-center text-sm">
                          <svg className="h-4 w-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-900">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {validation.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-800 mb-2">
                      Errors ({validation.errors.length})
                    </h4>
                    <div className="space-y-1">
                      {validation.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {validation.isValid && (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          All required files are present and valid!
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          You can now proceed with rebate calculations.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mt-8">
          <CardContent>
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Configuration Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
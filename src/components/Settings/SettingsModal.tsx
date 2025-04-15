import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PromptTemplates from './PromptTemplates';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transparency?: number;
    initialTab?: 'api' | 'prompts';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, transparency = 80, initialTab = 'api' }) => {
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            const result = await window.electronAPI.getApiKey();
            if (result.success) {
                setApiKey(result.apiKey || '');
            } else {
                setMessage({ text: 'Failed to load settings', type: 'error' });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            setMessage({ text: 'Failed to load settings', type: 'error' });
        }
    };

    const saveSettings = async () => {
        setIsSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const result = await window.electronAPI.setApiKey(apiKey);
            if (result.success) {
                setMessage({ text: 'Settings saved successfully', type: 'success' });
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setMessage({ text: 'Failed to save settings', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ text: 'Failed to save settings', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate background opacity based on transparency
    const getBackgroundStyle = (baseOpacity: number) => {
        const scaledOpacity = baseOpacity * (transparency / 100);
        return {
            backgroundColor: `rgba(0, 0, 0, ${scaledOpacity})`
        };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
            <div
                className="backdrop-blur-md rounded-lg border border-white/10 shadow-xl w-full max-w-md"
                style={getBackgroundStyle(0.6)}
            >
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-lg font-medium text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="border-b border-white/10">
                    <div className="flex">
                        <button
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'api'
                                ? 'text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white'
                                }`}
                            onClick={() => setActiveTab('api')}
                        >
                            API Settings
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'prompts'
                                ? 'text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white'
                                }`}
                            onClick={() => setActiveTab('prompts')}
                        >
                            Prompt Templates
                        </button>
                    </div>
                </div>

                {activeTab === 'api' ? (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                id="apiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full px-3 py-2 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={getBackgroundStyle(0.4)}
                                placeholder="Enter your Gemini API key"
                            />
                            <p className="text-xs text-gray-400">
                                Your API key is stored securely on your device and is never sent to our servers.
                            </p>
                        </div>

                        {message.text && (
                            <div className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-white border border-white/10 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                                style={getBackgroundStyle(0.4)}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveSettings}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600/80 rounded-md hover:bg-blue-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 max-h-[70vh] overflow-y-auto">
                        <PromptTemplates />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsModal; 
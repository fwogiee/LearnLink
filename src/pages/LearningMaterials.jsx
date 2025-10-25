import React, { useState, useEffect, useCallback } from 'react';
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { http, getSessionAuth, API_BASE } from '../lib/api.js';

export default function LearningMaterialsPage() {
    // State variables
    const [materials, setMaterials] = useState([]); // List of uploaded materials
    const [selectedFile, setSelectedFile] = useState(null); // File selected for upload
    const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' }); // Upload feedback { message, type: 'info'|'success'|'error' }
    const [loadingList, setLoadingList] = useState(true); // Loading state for the materials list
    const [uploading, setUploading] = useState(false); // Loading state for file upload
    const [viewingMaterial, setViewingMaterial] = useState(null); // Material being viewed
    const [loadingContent, setLoadingContent] = useState(false); // Loading state for content viewer

    // Fetch materials when the component mounts
    const fetchMaterials = useCallback(async () => {
        setLoadingList(true);
        setUploadStatus({ message: '', type: '' }); // Clear status on refresh
        try {
            const data = await http('/materials'); // Use GET /materials endpoint
            setMaterials(Array.isArray(data) ? data : []);
        } catch (error) {
            setUploadStatus({ message: error.message || 'Failed to load materials.', type: 'error' });
            setMaterials([]); // Clear list on error
        } finally {
            setLoadingList(false);
        }
    }, []);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    // Handle file selection change
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Basic client-side validation (optional, backend validation is primary)
            const allowedTypes = ['application/pdf', 'text/plain'];
            if (!allowedTypes.includes(file.type)) {
                setUploadStatus({ message: 'Invalid file type. Only PDF and TXT allowed.', type: 'error' });
                setSelectedFile(null);
                event.target.value = ''; // Clear file input
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                 setUploadStatus({ message: 'File too large. Maximum size is 10MB.', type: 'error' });
                 setSelectedFile(null);
                 event.target.value = ''; // Clear file input
                 return;
            }
            setSelectedFile(file);
            setUploadStatus({ message: '', type: '' }); // Clear previous errors
        } else {
            setSelectedFile(null);
        }
    };

    // Handle file upload submission
    const handleUpload = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            setUploadStatus({ message: 'Please select a file to upload.', type: 'error' });
            return;
        }

        setUploading(true);
        setUploadStatus({ message: `Uploading ${selectedFile.name}...`, type: 'info' });

        const formData = new FormData();
        formData.append('material', selectedFile); // Key 'material' must match backend multer setup

        try {
             // Construct the full URL for the fetch call
            const uploadUrl = `${API_BASE}/materials/upload`;
             // Use fetch directly for FormData
             // IMPORTANT: Don't set Content-Type - browser sets it automatically with boundary
            const { token } = getSessionAuth();
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers,
                body: formData,
            });

            const result = await response.json(); // Always try to parse JSON

             if (!response.ok) {
                 // Throw an error with the message from the backend if available
                 throw new Error(result.message || `Upload failed with status ${response.status}`);
             }

            setUploadStatus({ message: `Successfully uploaded ${result.originalName}.`, type: 'success' });
            setSelectedFile(null); // Clear selection
            document.getElementById('materialFile').value = ''; // Clear file input visually
            fetchMaterials(); // Refresh the list
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus({ message: error.message || 'Upload failed. Please try again.', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    // Handle viewing material content
    const handleViewContent = async (materialId, materialName) => {
        setLoadingContent(true);
        setUploadStatus({ message: `Loading ${materialName}...`, type: 'info' });
        
        try {
            const material = await http(`/materials/${materialId}`);
            setViewingMaterial(material);
            setUploadStatus({ message: '', type: '' });
        } catch (error) {
            setUploadStatus({ message: error.message || 'Failed to load content.', type: 'error' });
        } finally {
            setLoadingContent(false);
        }
    };

    // Handle closing the content viewer
    const handleCloseViewer = () => {
        setViewingMaterial(null);
    };

    // Handle deleting a material
    const handleDelete = async (materialId, materialName) => {
        // NOTE: Standard confirm is discouraged, replace with a modal if possible in production
        if (!window.confirm(`Are you sure you want to delete "${materialName}"?`)) {
            return;
        }

        setUploadStatus({ message: `Deleting ${materialName}...`, type: 'info' });

        try {
            await http(`/materials/${materialId}`, { method: 'DELETE' });
            setUploadStatus({ message: `Deleted ${materialName}.`, type: 'success' });
            fetchMaterials(); // Refresh the list
        } catch (error) {
            setUploadStatus({ message: error.message || 'Failed to delete material.', type: 'error' });
        }
    };

    // Render the component
    return (
        <Page title="Learning Materials" subtitle="Upload PDF or TXT files for processing">
            {/* Upload Section */}
            <section className="card mb-6 p-6">
                <h2 className="text-lg font-semibold mb-3">Upload New Material</h2>
                <form onSubmit={handleUpload} className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-grow">
                        <label htmlFor="materialFile" className="block text-sm font-medium text-neutral-700 mb-1">
                            Select PDF or TXT file (Max 10MB)
                        </label>
                        <input
                            type="file"
                            id="materialFile"
                            name="material"
                            onChange={handleFileChange}
                            accept=".pdf,.txt" // Only allow these extensions in the file picker
                            className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
                            // Removed 'required' as selection is checked in handleUpload
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={uploading || !selectedFile}>
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                </form>
                 {/* Display Upload Status */}
                {uploadStatus.message && (
                     <StatusMessage tone={uploadStatus.type || 'info'} className="mt-4">
                         {uploadStatus.message}
                     </StatusMessage>
                 )}
            </section>

            {/* Materials List Section */}
            <section className="card p-6">
                <h2 className="text-lg font-semibold mb-3">Uploaded Files</h2>
                {loadingList ? (
                    <LoadingSpinner label="Loading materials..." />
                ) : materials.length === 0 && !uploadStatus.message.includes('Failed to load') ? (
                    <p className="text-sm text-neutral-600">You haven't uploaded any materials yet.</p>
                ) : (
                    <ul className="divide-y divide-neutral-200">
                        {materials.map((material) => (
                            <li key={material._id} className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-neutral-800 truncate pr-4" title={material.originalName}>
                                    {material.originalName}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleViewContent(material._id, material.originalName)}
                                        className="btn-ghost text-xs text-blue-600 hover:text-blue-800"
                                        disabled={loadingContent}
                                    >
                                        View Content
                                    </button>
                                    <button
                                        onClick={() => handleDelete(material._id, material.originalName)}
                                        className="btn-ghost text-xs text-red-600 hover:text-red-800"
                                        disabled={uploadStatus.message.startsWith('Deleting')} // Prevent double clicks
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                 {/* Show loading error specifically for the list */}
                 {!loadingList && uploadStatus.type === 'error' && uploadStatus.message.includes('load') && (
                     <StatusMessage tone="error" className="mt-4">
                         {uploadStatus.message}
                     </StatusMessage>
                 )}
            </section>

            {/* Content Viewer Modal */}
            {viewingMaterial && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleCloseViewer}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold truncate pr-4">
                                {viewingMaterial.originalName}
                            </h3>
                            <button 
                                onClick={handleCloseViewer}
                                className="text-gray-500 hover:text-gray-700 text-2xl leading-none flex-shrink-0 w-8 h-8 flex items-center justify-center"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Modal Content */}
                        <div className="p-4 overflow-y-auto flex-grow">
                            <div className="text-sm text-gray-600 mb-3 flex items-center justify-between">
                                <span>
                                    <strong>Extracted Text:</strong> {viewingMaterial.content?.length || 0} characters
                                </span>
                                <span className="text-xs">
                                    Uploaded: {new Date(viewingMaterial.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            
                            {viewingMaterial.content && viewingMaterial.content.trim() ? (
                                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-auto">
                                    {viewingMaterial.content}
                                </pre>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
                                    <p className="font-semibold mb-2">⚠️ No text content extracted</p>
                                    <p className="text-sm">
                                        This might be an image-based PDF that requires OCR processing, or the file may not contain extractable text.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-4 border-t flex justify-end">
                            <button 
                                onClick={handleCloseViewer}
                                className="btn-primary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Page>
    );
}

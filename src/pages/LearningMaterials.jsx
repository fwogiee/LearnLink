import React, { useState, useEffect, useCallback } from 'react';
// Correcting paths relative to src/pages/LearningMaterials.jsx
import Page from '../components/Page.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { http, getSessionAuth, API_BASE } from '../lib/api.js'; // Import http, getSessionAuth, and API_BASE

// Define the LearningMaterialsPage component
export default function LearningMaterialsPage() {
    // State variables
    const [materials, setMaterials] = useState([]); // List of uploaded materials
    const [selectedFile, setSelectedFile] = useState(null); // File selected for upload
    const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' }); // Upload feedback { message, type: 'info'|'success'|'error' }
    const [loadingList, setLoadingList] = useState(true); // Loading state for the materials list
    const [uploading, setUploading] = useState(false); // Loading state for file upload

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
                                <button
                                    onClick={() => handleDelete(material._id, material.originalName)}
                                    className="btn-ghost text-xs text-red-600 hover:text-red-800"
                                    disabled={uploadStatus.message.startsWith('Deleting')} // Prevent double clicks
                                >
                                    Delete
                                </button>
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
        </Page>
    );
}



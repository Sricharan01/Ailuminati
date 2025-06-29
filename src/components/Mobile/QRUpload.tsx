import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Upload, Clock, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { qrService, QRCodeData } from '../../services/qrService';
import { uploadthingService } from '../../services/uploadthingService';
import { useAuth } from '../../contexts/AuthContext';

export function QRUpload() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState<Array<{ id: string; qrCodeUrl: string; data: QRCodeData }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; url: string; uploadedAt: string }>>([]);

  useEffect(() => {
    if (user) {
      loadActiveQRCodes();
      loadUploadedFiles();
    }
  }, [user]);

  const loadActiveQRCodes = async () => {
    if (!user) return;
    
    const activeQRs = qrService.getActiveQRCodes(user.id);
    const qrCodesWithUrls = await Promise.all(
      activeQRs.map(async (qr) => {
        const { qrCodeUrl } = await qrService.generateQRCode({
          type: qr.type,
          userId: qr.userId,
          expiresAt: qr.expiresAt,
          permissions: qr.permissions,
          documentId: qr.documentId,
          folderId: qr.folderId,
          workflowId: qr.workflowId
        });
        return { id: qr.id, qrCodeUrl, data: qr };
      })
    );
    setQrCodes(qrCodesWithUrls);
  };

  const loadUploadedFiles = () => {
    // Load uploaded files from UploadThing
    const files = uploadthingService.getUploadedFiles();
    setUploadedFiles(files);
  };

  const generateUploadQR = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Generate upload URL with UploadThing
      const uploadUrl = await uploadthingService.generateUploadUrl();

      const { id, qrCodeUrl } = await qrService.generateQRCode({
        type: 'document_upload',
        userId: user.id,
        expiresAt: expiresAt.toISOString(),
        permissions: ['document.create'],
        uploadUrl
      });

      const newQR = {
        id,
        qrCodeUrl,
        data: {
          id,
          type: 'document_upload' as const,
          userId: user.id,
          expiresAt: expiresAt.toISOString(),
          permissions: ['document.create'],
          uploadUrl
        }
      };

      setQrCodes(prev => [...prev, newQR]);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeQRCode = (id: string) => {
    qrService.revokeQRCode(id);
    setQrCodes(prev => prev.filter(qr => qr.id !== id));
  };

  const getQRTypeIcon = (type: string) => {
    switch (type) {
      case 'document_upload': return <Upload className="h-4 w-4" />;
      case 'folder_access': return <QrCode className="h-4 w-4" />;
      case 'workflow_action': return <CheckCircle className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'document_upload': return 'Document Upload';
      case 'folder_access': return 'Folder Access';
      case 'workflow_action': return 'Workflow Action';
      default: return 'Unknown';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mobile QR Upload</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate QR codes for secure mobile document upload via UploadThing
            </p>
          </div>
          <button
            onClick={generateUploadQR}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Generate Upload QR
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">How to use Mobile Upload</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Generate a QR code using the button above</li>
                  <li>Open your mobile camera or QR scanner app</li>
                  <li>Scan the QR code to open the secure upload interface</li>
                  <li>Take photos or select documents from your device</li>
                  <li>Documents will be securely uploaded via UploadThing and processed</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Active QR Codes */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-medium text-gray-900">Active QR Codes</h3>
          
          {qrCodes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active QR codes</p>
              <p className="text-sm text-gray-400">Generate a QR code to enable mobile uploads</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodes.map((qr) => (
                <div key={qr.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getQRTypeIcon(qr.data.type)}
                      <span className="text-sm font-medium text-gray-900">
                        {getQRTypeLabel(qr.data.type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isExpired(qr.data.expiresAt) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isExpired(qr.data.expiresAt)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isExpired(qr.data.expiresAt) ? 'Expired' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-3 mb-3">
                    <img
                      src={qr.qrCodeUrl}
                      alt="QR Code"
                      className="w-full h-32 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        Expires: {new Date(qr.data.expiresAt).toLocaleDateString()} at{' '}
                        {new Date(qr.data.expiresAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span>Permissions: {qr.data.permissions.join(', ')}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = `qr-upload-${qr.id}.png`;
                        link.href = qr.qrCodeUrl;
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => revokeQRCode(qr.id)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Files */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Mobile Uploads</h3>
          
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No files uploaded yet</p>
              <p className="text-sm text-gray-400">Files uploaded via QR codes will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
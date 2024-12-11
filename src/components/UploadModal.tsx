import React, { useCallback } from 'react';
import { PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpload
}) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

  const handleImageInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      onClose();
    }
    e.target.value = '';
  }, [onUpload, onClose]);

  const handleVideoInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      onClose();
    }
    e.target.value = '';
  }, [onUpload, onClose]);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-3">
        {/* Image Upload Option */}
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-3 cursor-pointer transition-colors group">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <PhotoIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900">Upload Image</span>
              <span className="text-xs text-gray-500">{imageTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</span>
            </div>
            <input
              type="file"
              className="hidden"
              accept={imageTypes.join(',')}
              onChange={handleImageInput}
            />
          </label>
        </div>

        {/* Video Upload Option */}
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-3 cursor-pointer transition-colors group">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <VideoCameraIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900">Upload Video</span>
              <span className="text-xs text-gray-500">{videoTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</span>
            </div>
            <input
              type="file"
              className="hidden"
              accept={videoTypes.join(',')}
              onChange={handleVideoInput}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;

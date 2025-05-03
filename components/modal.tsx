"use client";
import React from 'react';
import { ModalTitle } from '@/components/enum';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title, 
  message 
}) => {
  if (!isOpen) return null;

  const getTitleColorClass = () => {
    switch (title) {
      case ModalTitle.SUCCESS:
        return 'text-green-600';
      case ModalTitle.WARNING:
        return 'text-yellow-600';
      case ModalTitle.CONFIRM:
        return 'text-blue-600';
      case ModalTitle.ERROR:
        return 'text-red-600';
      case ModalTitle.DELETE:
        return 'text-red-600';
      default:
        return 'text-black-600';
    }
  };

  const getButtonColorClass = () => {
    switch (title) {
      case ModalTitle.SUCCESS:
        return 'bg-green-600 hover:bg-green-700';
      case ModalTitle.WARNING:
        return 'bg-yellow-600 hover:bg-yellow-700';
      case ModalTitle.CONFIRM:
        return 'bg-blue-600 hover:bg-blue-700';
      case ModalTitle.ERROR:
        return 'bg-red-600 hover:bg-red-700';
      case ModalTitle.DELETE:
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-black hover:bg-gray-700';
    }
  };

  const getIcon = () => {
    switch (title) {
      case ModalTitle.SUCCESS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case ModalTitle.WARNING:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case ModalTitle.ERROR:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case ModalTitle.CONFIRM:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        );
      case ModalTitle.DELETE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"> 
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto dark:bg-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Added scrollable content area */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center mb-4">
            <div className="mr-3">
              {getIcon()}
            </div>
            <h2 className={`text-xl font-bold ${getTitleColorClass()}`}>{title}</h2>
          </div>
          
          {/* Scrollable Message Area */}
          <p className="text-gray-600 whitespace-pre-wrap dark:text-white">{message}</p>
        </div>
        
        {/* Footer with close button */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-700 flex justify-end">
          <button 
            onClick={onClose}
            className={`px-4 py-2 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors bg-gray-600 hover:bg-gray-700 `}
          >
            ปิด
          </button>
          {onConfirm && (title === ModalTitle.CONFIRM || title === ModalTitle.DELETE)&& (
            <button 
              onClick={onConfirm}
              className={`ml-2 px-4 py-2 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${getButtonColorClass()}`}
            >
              ยืนยัน
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
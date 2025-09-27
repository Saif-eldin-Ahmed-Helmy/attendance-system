import React from 'react';
import './LoadingComponents.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  message?: string;
  overlay?: boolean;
}

/**
 * Loading Spinner Component
 * Provides consistent loading indicators across the application
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  message,
  overlay = false
}) => {
  const spinnerClasses = `spinner spinner--${size} spinner--${color}`;

  if (overlay) {
    return (
      <div className="loading-overlay">
        <div className="loading-overlay__content">
          <div className={spinnerClasses}></div>
          {message && <p className="loading-message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className={spinnerClasses}></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

/**
 * Skeleton Loader Component
 * Shows placeholder content while data is loading
 */
interface SkeletonLoaderProps {
  lines?: number;
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  lines = 3,
  height = '20px',
  className = ''
}) => {
  return (
    <div className={`skeleton-container ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton-line"
          style={{ height, animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};

/**
 * Loading Button Component
 * Button with integrated loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = 'Loading...',
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`btn ${className} ${loading ? 'btn--loading' : ''}`}
    >
      {loading && <div className="spinner spinner--small spinner--white" />}
      <span className={loading ? 'btn__text--loading' : ''}>
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

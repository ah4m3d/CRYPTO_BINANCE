'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  defaultTechnicalConfig, 
  getTechnicalIndicatorValue, 
  formatTechnicalValue, 
  getTechnicalColor, 
  getTechnicalStatus,
  TechnicalDisplayConfig 
} from '@/config/technical-indicators';

interface TechnicalIndicatorsDisplayProps {
  technical: any;
  config?: TechnicalDisplayConfig;
  className?: string;
}

export function TechnicalIndicatorsDisplay({ 
  technical, 
  config = defaultTechnicalConfig,
  className = ""
}: TechnicalIndicatorsDisplayProps) {
  const enabledIndicators = config.indicators.filter(indicator => indicator.enabled);
  
  if (!technical || enabledIndicators.length === 0) {
    return null;
  }

  return (
    <div className={`mt-2 pt-2 border-t ${className}`}>
      {/* Signal and Confidence */}
      <div className="flex justify-between text-xs mb-1">
        <span>Signal:</span>
        <Badge 
          variant={
            technical.signal === 'BUY' || technical.signal === 'STRONG_BUY' ? 'default' :
            technical.signal === 'SELL' || technical.signal === 'STRONG_SELL' ? 'destructive' :
            'secondary'
          }
          className="text-xs"
        >
          {technical.signal || 'HOLD'}
        </Badge>
      </div>
      
      {technical.confidence && (
        <div className="flex justify-between text-xs mb-2">
          <span>Confidence:</span>
          <span className="font-medium">{technical.confidence}%</span>
        </div>
      )}
      
      {/* Technical Indicators Grid */}
      <div className={`grid grid-cols-${config.layout.columnsPerRow} gap-1 text-xs mt-2`}>
        {enabledIndicators.map((indicator) => {
          const value = getTechnicalIndicatorValue(technical, indicator);
          
          if (value === null) return null;
          
          const formattedValue = formatTechnicalValue(value, indicator);
          const colorClass = getTechnicalColor(value, indicator, config.colorScheme);
          
          return (
            <div key={indicator.key} className="flex justify-between" title={indicator.description}>
              <span className="text-gray-500">{indicator.label}:</span>
              <span className={`font-medium ${colorClass}`}>
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Technical Analysis Summary */}
      <div className="mt-2 pt-1 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Technical Summary:</div>
        <div className="flex flex-wrap gap-1">
          {enabledIndicators.map((indicator) => {
            const value = getTechnicalIndicatorValue(technical, indicator);
            if (value === null) return null;
            
            const status = getTechnicalStatus(value, indicator);
            if (!status) return null;
            
            return (
              <Badge key={indicator.key} variant="outline" className="text-xs px-1 py-0">
                {indicator.label}: {status}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}

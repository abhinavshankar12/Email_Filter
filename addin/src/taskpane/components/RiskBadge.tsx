import * as React from 'react';
import './RiskBadge.css';

interface RiskBadgeProps {
  score: number;
  decision: 'junk' | 'warning' | 'safe';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, decision }) => {
  const getBadgeClass = () => {
    if (decision === 'junk') return 'risk-badge-danger';
    if (decision === 'warning') return 'risk-badge-warning';
    return 'risk-badge-safe';
  };

  const getLabel = () => {
    if (decision === 'junk') return 'HIGH RISK';
    if (decision === 'warning') return 'SUSPICIOUS';
    return 'SAFE';
  };

  const getDescription = () => {
    if (decision === 'junk') {
      return 'This email has multiple indicators of phishing or spam and should not be trusted.';
    }
    if (decision === 'warning') {
      return 'This email has some suspicious characteristics. Review carefully before responding.';
    }
    return 'This email appears legitimate based on our analysis.';
  };

  return (
    <div className={`risk-badge ${getBadgeClass()}`}>
      <div className="risk-badge-header">
        <div className="risk-badge-score">{score}</div>
        <div className="risk-badge-label">{getLabel()}</div>
      </div>
      <div className="risk-badge-description">{getDescription()}</div>
    </div>
  );
};


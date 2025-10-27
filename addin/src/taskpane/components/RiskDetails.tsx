import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { DetailsList, IColumn, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { ProcessingDecision } from '../types';
import './RiskDetails.css';

interface RiskDetailsProps {
  decision: ProcessingDecision;
}

export const RiskDetails: React.FC<RiskDetailsProps> = ({ decision }) => {
  const columns: IColumn[] = [
    {
      key: 'description',
      name: 'Risk Factor',
      fieldName: 'description',
      minWidth: 200,
      maxWidth: 300,
      isResizable: true,
    },
    {
      key: 'points',
      name: 'Points',
      fieldName: 'points',
      minWidth: 60,
      maxWidth: 80,
      isResizable: true,
      onRender: (item) => {
        const className = item.points > 0 ? 'points-positive' : 'points-negative';
        return <span className={className}>{item.points > 0 ? '+' : ''}{item.points}</span>;
      },
    },
  ];

  return (
    <Stack tokens={{ childrenGap: 10 }}>
      <h3>Risk Analysis</h3>

      {decision.mlRationale && (
        <div className="ml-rationale">
          <strong>AI Analysis:</strong> {decision.mlRationale}
          {decision.mlScore !== undefined && (
            <span className="ml-score"> (Score adjustment: {decision.mlScore > 0 ? '+' : ''}{decision.mlScore})</span>
          )}
        </div>
      )}

      {decision.reasons.length > 0 ? (
        <DetailsList
          items={decision.reasons}
          columns={columns}
          selectionMode={SelectionMode.none}
          compact={true}
        />
      ) : (
        <p>No specific risk factors detected.</p>
      )}

      <div className="score-breakdown">
        <p>
          <strong>Base Score:</strong> {decision.baseScore || decision.riskScore}
          {decision.mlScore !== undefined && (
            <>
              {' + '}
              <strong>ML Adjustment:</strong> {decision.mlScore}
              {' = '}
            </>
          )}
          <strong>Final Score:</strong> {decision.riskScore}
        </p>
      </div>
    </Stack>
  );
};


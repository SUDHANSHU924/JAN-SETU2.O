import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Clock, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import './TaskCard.css';

export function TaskCard({ title, id, category, state = 'pending', date, priorityLevel }) {
  const getIcon = () => {
    switch (state) {
      case 'completed': return <CheckCircle size={18} color="var(--status-low)" />;
      case 'active':    return <PlayCircle  size={18} color="var(--teal-primary)" />;
      case 'urgent':    return <AlertCircle size={18} color="var(--status-high)" />;
      default:          return <Clock       size={18} color="var(--text-secondary)" />;
    }
  };

  return (
    <Card state={state} className="task-card animate-fade-in">
      <div className="task-card__header">
        <div className="task-card__title-group">
          {getIcon()}
          <h3 className="task-card__title">{title}</h3>
        </div>
        <span className="task-card__id">{id}</span>
      </div>
      
      <div className="task-card__footer">
        <div className="task-card__badges">
          {state === 'completed' && <Badge variant="completed">RESOLVED</Badge>}
          {state !== 'normal' && state !== 'pending' && state !== 'completed' && (
             <Badge variant={state}>{state.toUpperCase()}</Badge>
          )}
          {priorityLevel && <Badge variant={priorityLevel.toLowerCase()}>{priorityLevel.toUpperCase()} PRIORITY</Badge>}
          {category && <Badge>{category}</Badge>}
        </div>
        <span className="task-card__date">{date}</span>
      </div>
    </Card>
  );
}

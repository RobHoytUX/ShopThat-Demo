// src/dashboard/entities/dashboard.entity.ts
import { Widget } from './widget.entity';

export class Dashboard {
    id: string; // Use UUID or another identifier
    widgets: Widget[];
}

import type { ReactNode } from 'react';
import type { ModuleIconComponent } from './types';
export function createModuleIcon(content: ReactNode): ModuleIconComponent {
    return function ModuleIcon({ className = '' }) {
        return <svg className={`module-icon ${className}`.trim()} viewBox="0 0 32 32" aria-hidden="true" focusable="false">{content}</svg>;
    };
}

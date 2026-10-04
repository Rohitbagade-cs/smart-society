import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Typed toast notifications with subtle slide-in animation.
 *
 * Wraps MatSnackBar so call sites read clearly:
 *   toast.success('Visitor registered');
 *   toast.error('Save failed');
 *   toast.info('Approval sent to the resident');
 *
 * Styling/animation lives in styles.css (.toast, .toast-success, ...).
 * Positioned top-right like real-world app toasts; auto-dismisses.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private snack = inject(MatSnackBar);

  private show(message: string, kind: string, duration = 3200): void {
    this.snack.open(message, 'Dismiss', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['toast', `toast-${kind}`],
    });
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }
}

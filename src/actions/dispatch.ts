'use server';

import * as manage from './dispatch/manage';
import * as status from './dispatch/status';
import * as query from './dispatch/query';
import { DispatchStatus } from '@prisma/client';

export async function createDailyDispatch(formData: unknown) {
  return manage.createDailyDispatch(formData);
}

export async function createQuickCustomer(formData: { name: string; phone: string; address?: string }) {
  return manage.createQuickCustomer(formData);
}

export async function updateDailyDispatch(formData: unknown) {
  return manage.updateDailyDispatch(formData);
}

export async function updateDispatchStatus(formData: unknown) {
  return status.updateDispatchStatus(formData);
}

export async function reportDriverIncident(formData: unknown) {
  return status.reportDriverIncident(formData);
}

export async function resolveDispatchConflict(dispatchId: string, resolutionNotes: string) {
  return status.resolveDispatchConflict(dispatchId, resolutionNotes);
}

export async function finalizeDispatchScope(formData: unknown) {
  return status.finalizeDispatchScope(formData);
}

export async function getDispatches(filter?: { status?: DispatchStatus; isFlagged?: boolean; siteBundleId?: string }) {
  return query.getDispatches(filter);
}

export async function fetchDispatchesByRange(startDate: string, endDate: string) {
  return query.fetchDispatchesByRange(startDate, endDate);
}

import { ipcMain } from 'electron';
import {
  GetAccountsUseCase,
  GetJournalEntriesUseCase,
  GetEntryByIdUseCase,
  GetTrialBalanceUseCase,
  GetProfitLossUseCase,
  GetBalanceSheetUseCase,
} from '@nuqtaplus/core';
import { SqliteAccountingRepository, DatabaseType } from '@nuqtaplus/data';

export function registerAccountingHandlers(db: DatabaseType) {
  const repo = new SqliteAccountingRepository(db.db);
  const getAccountsUC = new GetAccountsUseCase(repo);
  const getEntriesUC = new GetJournalEntriesUseCase(repo);
  const getEntryByIdUC = new GetEntryByIdUseCase(repo);
  const getTrialBalanceUC = new GetTrialBalanceUseCase(repo);
  const getProfitLossUC = new GetProfitLossUseCase(repo);
  const getBalanceSheetUC = new GetBalanceSheetUseCase(repo);

  ipcMain.handle('accounting:getAccounts', async () => {
    try {
      const result = await getAccountsUC.execute();
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: { message: error.message } };
    }
  });

  ipcMain.handle('accounting:getJournalEntries', async (_, params: any) => {
    try {
      const result = await getEntriesUC.execute(params?.params || params);
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: { message: error.message } };
    }
  });

  ipcMain.handle('accounting:getEntryById', async (_, payload: any) => {
    try {
      const id = payload?.id ?? payload;
      const result = await getEntryByIdUC.execute(Number(id));
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: { message: error.message } };
    }
  });

  ipcMain.handle('accounting:getTrialBalance', async (_, params: any) => {
    try {
      const result = await getTrialBalanceUC.execute(params?.params || params);
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: { message: error.message } };
    }
  });

  ipcMain.handle('accounting:getProfitLoss', async (_, params: any) => {
    try {
      const result = await getProfitLossUC.execute(params?.params || params);
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: { message: error.message } };
    }
  });

  ipcMain.handle('accounting:getBalanceSheet', async (_, params: any) => {
    try {
      const result = await getBalanceSheetUC.execute(params?.params || params);
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: { message: error.message } };
    }
  });
}

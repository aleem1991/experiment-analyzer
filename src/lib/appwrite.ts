/**
 * Appwrite SDK Client & Dual-Mode Adapter
 * Connects to live Appwrite Cloud when credentials are configured.
 * Seamlessly provides persistent local fallback during offline/development mode.
 */

import { Client, Account, Databases, Functions, Query, ID, Permission, Role } from 'appwrite';
import { StoredExperiment, StoredAnalysis, StatResult, PreRegistrationDeclaration } from '../types';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
export const DATABASE_ID = import.meta.env.VITE_DATABASE_ID || 'analyzer';
export const TABLE_EXPERIMENTS = 'experiments';
export const TABLE_ANALYSES = 'analyses';
export const FUNCTION_ANALYSE = import.meta.env.VITE_FUNCTION_ID || 'analyse';

export const isLiveAppwriteConfigured = Boolean(
  APPWRITE_PROJECT_ID && APPWRITE_PROJECT_ID !== 'YOUR_APPWRITE_PROJECT_ID'
);

export const client = new Client();
if (isLiveAppwriteConfigured) {
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  // Ping Appwrite to verify connection and satisfy Appwrite Cloud dashboard setup
  client.ping()
    .then((res) => console.log('✅ Appwrite live ping success:', res))
    .catch((err) => console.warn('Appwrite ping notice:', err));
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export { Query, ID, Permission, Role };

// -------------------------------------------------------------
// Auth: Anonymous Session Management
// -------------------------------------------------------------
export interface AuthUser {
  $id: string;
  name: string;
  email?: string;
  isAnonymous: boolean;
}

export async function getCurrentUser(): Promise<AuthUser> {
  if (!isLiveAppwriteConfigured) {
    let mockId = localStorage.getItem('mock_appwrite_user_id');
    if (!mockId) {
      mockId = 'anon_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('mock_appwrite_user_id', mockId);
    }
    return {
      $id: mockId,
      name: 'Anonymous Researcher',
      isAnonymous: true,
    };
  }

  try {
    const user = await account.get();
    return {
      $id: user.$id,
      name: user.name || 'Anonymous User',
      email: user.email,
      isAnonymous: !user.email,
    };
  } catch {
    // If not authenticated, initiate an anonymous session
    const session = await account.createAnonymousSession();
    return {
      $id: session.userId,
      name: 'Anonymous Judge',
      isAnonymous: true,
    };
  }
}

// -------------------------------------------------------------
// Statistics Execution (Function vs Local Bridge)
// -------------------------------------------------------------
export async function executeAnalysis(payload: Record<string, any>): Promise<StatResult> {
  if (isLiveAppwriteConfigured) {
    try {
      const exec = await functions.createExecution(
        FUNCTION_ANALYSE,
        JSON.stringify(payload),
        false
      );
      if (exec.status === 'completed' && exec.responseBody) {
        return JSON.parse(exec.responseBody);
      }
    } catch (err) {
      console.warn('Appwrite Function execution returned error, falling back to local bridge:', err);
    }
  }

  // Fallback to local python bridge / local API
  const res = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Analysis failed with status ${res.status}`);
  }

  return await res.json();
}

// -------------------------------------------------------------
// TablesDB Operations: Experiments & Analyses
// -------------------------------------------------------------
export async function saveAnalysisResult(
  declaration: PreRegistrationDeclaration,
  statResult: StatResult,
  metadata: {
    name: string;
    description?: string;
    source: 'upload' | 'paste' | 'demo';
  }
): Promise<{ experimentId: string; analysisId: string }> {
  const user = await getCurrentUser();
  const expId = 'exp_' + Math.random().toString(36).substring(2, 10);
  const anaId = 'ana_' + Math.random().toString(36).substring(2, 10);

  const experimentData: StoredExperiment = {
    $id: expId,
    $createdAt: new Date().toISOString(),
    ownerId: user.$id,
    name: metadata.name,
    description: metadata.description || '',
    metricType: declaration.metricType,
    labelA: declaration.labelA,
    labelB: declaration.labelB,
    nA: statResult.descriptives.a.n,
    nB: statResult.descriptives.b.n,
    isPublic: false,
    source: metadata.source,
  };

  const analysisData: StoredAnalysis = {
    $id: anaId,
    $createdAt: new Date().toISOString(),
    experimentId: expId,
    ownerId: user.$id,
    hypothesis: declaration.hypothesis,
    alpha: declaration.alpha,
    alternative: declaration.direction,
    minEffect: declaration.minEffect,
    test: statResult.test,
    statistic: statResult.statistic,
    pValue: statResult.pValue,
    effectName: statResult.effectName,
    effectValue: statResult.effectValue,
    ciLow: statResult.ciLow,
    ciHigh: statResult.ciHigh,
    mde: statResult.mde,
    verdict: statResult.verdict,
    assumptionsJson: JSON.stringify(statResult.assumptions),
    descriptivesJson: JSON.stringify(statResult.descriptives),
    caveats: statResult.caveats,
    summaryText: statResult.summaryText,
    seed: statResult.seed,
    engineVersion: statResult.engineVersion,
    isPublic: false,
    experiment: experimentData,
  };

  if (isLiveAppwriteConfigured) {
    try {
      // 1. Create Experiment Row with Row-Level Security
      await databases.createDocument(
        DATABASE_ID,
        TABLE_EXPERIMENTS,
        ID.unique(),
        {
          ownerId: user.$id,
          name: metadata.name,
          description: metadata.description || '',
          metricType: declaration.metricType,
          labelA: declaration.labelA,
          labelB: declaration.labelB,
          nA: statResult.descriptives.a.n,
          nB: statResult.descriptives.b.n,
          isPublic: false,
          source: metadata.source,
        },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );

      // 2. Create Analysis Row linked to Experiment
      const createdAna = await databases.createDocument(
        DATABASE_ID,
        TABLE_ANALYSES,
        ID.unique(),
        {
          experimentId: expId,
          ownerId: user.$id,
          hypothesis: declaration.hypothesis,
          alpha: declaration.alpha,
          alternative: declaration.direction,
          minEffect: declaration.minEffect,
          test: statResult.test,
          statistic: statResult.statistic,
          pValue: statResult.pValue,
          effectName: statResult.effectName,
          effectValue: statResult.effectValue,
          ciLow: statResult.ciLow,
          ciHigh: statResult.ciHigh,
          mde: statResult.mde,
          verdict: statResult.verdict,
          assumptionsJson: JSON.stringify(statResult.assumptions),
          caveats: statResult.caveats,
          seed: statResult.seed,
          engineVersion: statResult.engineVersion,
        },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );

      return { experimentId: expId, analysisId: createdAna.$id };
    } catch (err) {
      console.warn('Appwrite database write error, caching to local store:', err);
    }
  }

  // Local storage fallback
  const storedAnalyses: StoredAnalysis[] = JSON.parse(
    localStorage.getItem('ea_analyses') || '[]'
  );
  storedAnalyses.unshift(analysisData);
  localStorage.setItem('ea_analyses', JSON.stringify(storedAnalyses));

  return { experimentId: expId, analysisId: anaId };
}

export async function getAnalysisById(id: string): Promise<StoredAnalysis | null> {
  if (isLiveAppwriteConfigured) {
    try {
      const doc = await databases.getDocument(DATABASE_ID, TABLE_ANALYSES, id);
      return doc as unknown as StoredAnalysis;
    } catch {
      // Check local store
    }
  }

  const storedAnalyses: StoredAnalysis[] = JSON.parse(
    localStorage.getItem('ea_analyses') || '[]'
  );
  return storedAnalyses.find((a) => a.$id === id) || null;
}

export async function listUserAnalyses(): Promise<StoredAnalysis[]> {
  const user = await getCurrentUser();

  if (isLiveAppwriteConfigured) {
    try {
      const res = await databases.listDocuments(DATABASE_ID, TABLE_ANALYSES, [
        Query.equal('ownerId', user.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      return res.documents as unknown as StoredAnalysis[];
    } catch {
      // Fallback to local
    }
  }

  const storedAnalyses: StoredAnalysis[] = JSON.parse(
    localStorage.getItem('ea_analyses') || '[]'
  );
  return storedAnalyses.filter((a) => a.ownerId === user.$id);
}

export async function toggleShareAnalysis(analysisId: string, makePublic: boolean): Promise<boolean> {
  const user = await getCurrentUser();

  if (isLiveAppwriteConfigured) {
    try {
      const permissions = makePublic
        ? [
            Permission.read(Role.any()),
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ]
        : [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ];

      await databases.updateDocument(
        DATABASE_ID,
        TABLE_ANALYSES,
        analysisId,
        { isPublic: makePublic },
        permissions
      );
      return true;
    } catch (err) {
      console.warn('Appwrite permission update failed:', err);
    }
  }

  const storedAnalyses: StoredAnalysis[] = JSON.parse(
    localStorage.getItem('ea_analyses') || '[]'
  );
  const idx = storedAnalyses.findIndex((a) => a.$id === analysisId);
  if (idx !== -1) {
    storedAnalyses[idx].isPublic = makePublic;
    localStorage.setItem('ea_analyses', JSON.stringify(storedAnalyses));
    return true;
  }
  return false;
}

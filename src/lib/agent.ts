import { addChatMessage, addTimelineEvent, getIncident, listChatMessages, listRunbooks } from './db';
import { recallSimilarIncidents } from './hindsight';
import { runIncidentAnalysis } from './grok';
import type { AgentAnalysis, RecallOutcome } from './types';

export async function investigateIncident(incidentId: string): Promise<{
  analysis: AgentAnalysis;
  recall: RecallOutcome;
}> {
  const incident = getIncident(incidentId);
  if (!incident) throw new Error('Incident not found');

  addTimelineEvent(incidentId, 'investigation_started', 'Investigation started');

  const recall = await recallSimilarIncidents(incident);
  addTimelineEvent(
    incidentId,
    'memory_recall',
    recall.usedHindsight
      ? `Memory recall completed - ${recall.memoriesFound} relevant memories found`
      : `Memory recall skipped or failed - ${recall.error}`
  );

  const runbooks = listRunbooks();
  const analysis = await runIncidentAnalysis({ incident, recall, runbooks });
  addTimelineEvent(incidentId, 'analysis_generated', 'Agent analysis generated');

  const userMsg = 'Investigate this incident and suggest the possible root cause and resolution.';
  addChatMessage(incidentId, 'user', userMsg);
  addChatMessage(incidentId, 'agent', renderAnalysisAsMessage(analysis, recall));

  return { analysis, recall };
}

export async function askFollowUp(incidentId: string, question: string): Promise<{ analysis: AgentAnalysis; recall: RecallOutcome }> {
  const incident = getIncident(incidentId);
  if (!incident) throw new Error('Incident not found');

  const priorMessages = listChatMessages(incidentId).map((m) => ({ role: m.role, content: m.content }));
  const recall = await recallSimilarIncidents(incident);
  const runbooks = listRunbooks();

  addChatMessage(incidentId, 'user', question);
  const analysis = await runIncidentAnalysis({
    incident,
    recall,
    runbooks,
    followUpQuestion: question,
    priorMessages,
  });
  addTimelineEvent(incidentId, 'follow_up', `Follow-up question asked: "${question}"`);
  addChatMessage(incidentId, 'agent', renderAnalysisAsMessage(analysis, recall));

  return { analysis, recall };
}

function renderAnalysisAsMessage(analysis: AgentAnalysis, recall: RecallOutcome): string {
  if (analysis.usedFallback) {
    return `${analysis.summary}\n\n(${analysis.fallbackReason})`;
  }
  const lines = [analysis.summary];
  if (analysis.likelyRootCause) lines.push(`\nLikely root cause: ${analysis.likelyRootCause}`);
  if (analysis.recommendedActions.length) {
    lines.push('\nRecommended actions:');
    analysis.recommendedActions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }
  if (recall.usedHindsight && recall.memoriesFound > 0) {
    lines.push(`\n(${recall.memoriesFound} relevant previous incident(s) considered.)`);
  }
  return lines.join('\n');
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import {
  AnswerBullet,
  CostAlignmentReport,
  CostPillarId,
  LivingContextSummary,
  TimeOracleInsights
} from '../types.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const analyzerModel = genAI.getGenerativeModel({
  model: config.geminiModel,
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 900
  }
});

export interface CostDnaAnalyzerInput {
  query: string;
  answer: AnswerBullet[];
  livingContext?: LivingContextSummary;
  temporalInsights?: TimeOracleInsights;
}

const formatPrinciples = (): string =>
  config.costPrinciples
    .map(principle => {
      const lines = [
        `ID: ${principle.id}`,
        `Name: ${principle.name}`,
        `Description: ${principle.description}`,
        `Guiding questions: ${principle.guidingQuestions.join(' | ')}`,
        `Positive signals: ${principle.positiveSignals.join(' | ')}`,
        `Red flags: ${principle.redFlags.join(' | ')}`
      ];
      return lines.join('\n');
    })
    .join('\n\n');

const formatAnswer = (answer: AnswerBullet[]): string =>
  answer
    .map((bullet, index) => {
      const cites = bullet.cites
        .map(cite => `${cite.title} (${cite.url})`)
        .join(' | ');
      return `[#${index + 1}] ${bullet.text}\nCITES: ${cites}`;
    })
    .join('\n');

const safeParseReport = (payload: string): CostAlignmentReport | undefined => {
  try {
    const jsonMatch = payload.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : payload;
    const parsed = JSON.parse(jsonText) as CostAlignmentReport;
    return parsed;
  } catch (error) {
    console.error('CoST DNA Analyzer JSON parse failed:', error);
    return undefined;
  }
};

const normalizePillar = (pillar: string): CostPillarId | undefined => {
  switch (pillar) {
    case 'disclosureTransparency':
    case 'assuranceQuality':
    case 'multiStakeholderParticipation':
    case 'socialAccountability':
      return pillar;
    default:
      return undefined;
  }
};

export const analyzeCostAlignment = async (
  input: CostDnaAnalyzerInput
): Promise<CostAlignmentReport> => {
  const { query, answer, livingContext, temporalInsights } = input;

  const prompt = `
You are the CoST DNA Analyzer (Ethos Guardian). Audit the recommendations against the four CoST pillars.

CoST Principles:
${formatPrinciples()}

User query: ${query}

Answer bullets:
${formatAnswer(answer)}

Living context summary:
${livingContext ? livingContext.synthesis : 'No hybrid context available.'}

Temporal considerations:
${temporalInsights ? temporalInsights.recommendedActions.join(' | ') : 'No temporal notes'}

Respond with a JSON payload matching:
{
  "overallScore": 0-10 (float),
  "pillarScores": [
    { "pillar": "disclosureTransparency", "score": 0-10, "rationale": "string" },
    { "pillar": "assuranceQuality", "score": 0-10, "rationale": "string" },
    { "pillar": "multiStakeholderParticipation", "score": 0-10, "rationale": "string" },
    { "pillar": "socialAccountability", "score": 0-10, "rationale": "string" }
  ],
  "risks": [
    { "pillar": "disclosureTransparency|assuranceQuality|multiStakeholderParticipation|socialAccountability", "risk": "string", "severity": "low|medium|high" }
  ],
  "stakeholderBalance": [
    { "stakeholder": "government|privateSector|civilSociety|beneficiaries|oversightBodies", "emphasis": "strong|balanced|underrepresented", "notes": "string" }
  ],
  "powerDynamics": [
    { "description": "string", "impactedStakeholders": ["..."], "mitigationIdeas": ["..."] }
  ],
  "generatedAt": "ISO timestamp"
}

Do NOT add explanations outside the JSON.
`.trim();

  try {
    const response = await analyzerModel.generateContent(prompt);
    const text = response.response.text().trim();
    const parsed = safeParseReport(text);
    if (parsed) {
      const normalizedPillarScores = parsed.pillarScores
        ?.map(score => {
          const normalized = normalizePillar(score.pillar);
          if (!normalized) {
            return undefined;
          }
          return {
            pillar: normalized,
            score: Math.max(0, Math.min(10, score.score)),
            rationale: score.rationale
          };
        })
        .filter((score): score is CostAlignmentReport['pillarScores'][number] => Boolean(score));

      const normalizedRisks = parsed.risks
        ?.map(risk => {
          const normalized = normalizePillar(risk.pillar);
          if (!normalized) {
            return undefined;
          }
          if (!['low', 'medium', 'high'].includes(risk.severity)) {
            return undefined;
          }
          return { ...risk, pillar: normalized };
        })
        .filter((risk): risk is CostAlignmentReport['risks'][number] => Boolean(risk));

      const normalizedStakeholderBalance = parsed.stakeholderBalance?.filter(item =>
        ['government', 'privateSector', 'civilSociety', 'beneficiaries', 'oversightBodies'].includes(item.stakeholder)
      ) ?? [];

      const normalizedPowerDynamics = parsed.powerDynamics?.map(item => ({
        ...item,
        impactedStakeholders: item.impactedStakeholders ?? [],
        mitigationIdeas: item.mitigationIdeas ?? []
      })) ?? [];

      return {
        overallScore: Math.max(0, Math.min(10, parsed.overallScore)),
        pillarScores: normalizedPillarScores ?? [],
        risks: normalizedRisks ?? [],
        stakeholderBalance: normalizedStakeholderBalance,
        powerDynamics: normalizedPowerDynamics,
        generatedAt: parsed.generatedAt || new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('CoST DNA Analyzer failed:', error);
  }

  const fallback: CostAlignmentReport = {
    overallScore: 5,
    pillarScores: config.costPrinciples.map(principle => ({
      pillar: principle.id,
      score: 5,
      rationale: `No automated assessment available for ${principle.name}. Manual review recommended.`
    })),
    risks: [],
    stakeholderBalance: [
      { stakeholder: 'government', emphasis: 'balanced', notes: 'No automated insight' },
      { stakeholder: 'privateSector', emphasis: 'balanced', notes: 'No automated insight' },
      { stakeholder: 'civilSociety', emphasis: 'underrepresented', notes: 'Confirm inclusion of community voice.' },
      { stakeholder: 'beneficiaries', emphasis: 'underrepresented', notes: 'Check for citizen-facing follow-ups.' },
      { stakeholder: 'oversightBodies', emphasis: 'balanced', notes: 'Verify assurance partners are engaged.' }
    ],
    powerDynamics: [],
    generatedAt: new Date().toISOString()
  };

  return fallback;
};

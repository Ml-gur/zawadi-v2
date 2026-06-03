export interface MentorReviewEntitlement {
  reviews_per_month: number | null;
  response_days_guarantee: number;
  feedback_type: 'basic' | 'structured' | 'full' | 'full_plus';
  includes_revised_sections: boolean;
  includes_strategy_session: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const MENTOR_REVIEW_LIMITS: Record<string, MentorReviewEntitlement> = {
  explorer: {
    reviews_per_month: 1,
    response_days_guarantee: 7,
    feedback_type: 'basic',
    includes_revised_sections: false,
    includes_strategy_session: false,
    priority: 'low',
  },
  plus: {
    reviews_per_month: 2,
    response_days_guarantee: 5,
    feedback_type: 'structured',
    includes_revised_sections: false,
    includes_strategy_session: false,
    priority: 'medium',
  },
  pro: {
    reviews_per_month: 4,
    response_days_guarantee: 2,
    feedback_type: 'full',
    includes_revised_sections: true,
    includes_strategy_session: false,
    priority: 'high',
  },
  institutional: {
    reviews_per_month: null,
    response_days_guarantee: 1,
    feedback_type: 'full_plus',
    includes_revised_sections: true,
    includes_strategy_session: true,
    priority: 'urgent',
  },
};

export const PLAN_LABELS: Record<string, string> = {
  explorer: 'Explorer',
  plus: 'Scholar Plus',
  pro: 'Application Pro',
  institutional: 'Zawadi Institutional',
};

export const PLAN_HIERARCHY: Record<string, number> = {
  explorer: 0, plus: 1, pro: 2, institutional: 3,
};

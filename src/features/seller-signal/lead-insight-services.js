import {supabase} from '../../supabase';
import {createLeadInsightServices} from '../../../shared/lead-insights';
export const {fetchAvailableMarketBuildingKeys,fetchBuildingKeysWithTransactionsOn,fetchBuildingMarketData,getMissingFallbackBuildingNames,computeLeadInsights} = createLeadInsightServices(supabase);

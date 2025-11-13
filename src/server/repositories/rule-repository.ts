import { supabase } from '@/lib/db'

export class RuleRepository {
  async findByKey(key: string) {
    return supabase.findRuleByKey(key)
  }

  async findAll() {
    return supabase.findAllRules()
  }

  async upsert(key: string, value: any) {
    return supabase.upsertRule(key, value)
  }

  async delete(key: string) {
    return supabase.deleteRule(key)
  }
}

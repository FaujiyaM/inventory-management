<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>

      <!-- Budget Slider -->
      <div class="card budget-card">
        <div class="budget-header">
          <h3 class="card-title">{{ t('restocking.budget') }}</h3>
          <span class="budget-value">{{ currencySymbol }}{{ budget.toLocaleString() }}</span>
        </div>
        <input
          type="range"
          class="budget-slider"
          min="0"
          max="1000000"
          step="1000"
          v-model.number="budget"
        />
        <div class="slider-labels">
          <span>{{ currencySymbol }}0</span>
          <span>{{ currencySymbol }}250,000</span>
          <span>{{ currencySymbol }}500,000</span>
          <span>{{ currencySymbol }}750,000</span>
          <span>{{ currencySymbol }}1,000,000</span>
        </div>
      </div>

      <!-- Recommended Items -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            {{ t('restocking.recommended') }}
            <span class="item-count">{{ recommendedItems.length }} {{ t('common.items') }}</span>
          </h3>
          <div class="budget-summary">
            {{ t('restocking.budgetUsed') }}:
            <strong>{{ currencySymbol }}{{ totalCost.toLocaleString() }}</strong>
            / {{ currencySymbol }}{{ budget.toLocaleString() }}
            <span class="budget-bar-wrap">
              <span class="budget-bar" :style="{ width: budgetPercent + '%' }"></span>
            </span>
          </div>
        </div>

        <div v-if="recommendedItems.length === 0" class="no-items">
          {{ t('restocking.noItems') }}
        </div>
        <div v-else class="table-container">
          <table class="restocking-table">
            <thead>
              <tr>
                <th class="col-item">{{ t('restocking.columns.item') }}</th>
                <th class="col-sku">{{ t('restocking.columns.sku') }}</th>
                <th class="col-qty">{{ t('restocking.columns.qty') }}</th>
                <th class="col-unit">{{ t('restocking.columns.unitCost') }}</th>
                <th class="col-total">{{ t('restocking.columns.total') }}</th>
                <th class="col-trend">{{ t('restocking.columns.trend') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in recommendedItems" :key="item.item_sku">
                <td class="col-item"><strong>{{ item.item_name }}</strong></td>
                <td class="col-sku"><code>{{ item.item_sku }}</code></td>
                <td class="col-qty">{{ item.quantity.toLocaleString() }}</td>
                <td class="col-unit">{{ currencySymbol }}{{ item.unit_cost.toLocaleString() }}</td>
                <td class="col-total"><strong>{{ currencySymbol }}{{ item.total_cost.toLocaleString() }}</strong></td>
                <td class="col-trend">
                  <span :class="['badge', 'trend-' + item.trend]">
                    {{ item.trend === 'increasing' ? '↑' : '→' }} {{ item.trend }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Place Order -->
        <div class="order-footer">
          <div v-if="submitted" class="success-message">
            {{ t('restocking.orderPlaced') }}
          </div>
          <button
            class="place-order-btn"
            :disabled="recommendedItems.length === 0 || submitting"
            @click="placeOrder"
          >
            {{ submitting ? t('restocking.submitting') : t('restocking.placeOrder') }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency } = useI18n()

    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const loading = ref(true)
    const error = ref(null)
    const submitting = ref(false)
    const submitted = ref(false)
    const budget = ref(50000)
    const allForecasts = ref([])
    const inventoryItems = ref([])

    // SKU → unit_cost lookup
    const costMap = computed(() => {
      const map = {}
      for (const item of inventoryItems.value) {
        map[item.sku] = item.unit_cost
      }
      return map
    })

    // Greedy recommendation: increasing first, then stable; skip decreasing
    const recommendedItems = computed(() => {
      const sorted = [...allForecasts.value]
        .filter(f => f.trend !== 'decreasing')
        .sort((a, b) => {
          if (a.trend === b.trend) return 0
          return a.trend === 'increasing' ? -1 : 1
        })

      let remaining = budget.value
      const result = []
      for (const forecast of sorted) {
        const unit_cost = costMap.value[forecast.item_sku] ?? 0
        const quantity = forecast.forecasted_demand
        const total_cost = quantity * unit_cost
        if (total_cost <= remaining) {
          result.push({ ...forecast, unit_cost, quantity, total_cost })
          remaining -= total_cost
        }
      }
      return result
    })

    const totalCost = computed(() =>
      recommendedItems.value.reduce((sum, item) => sum + item.total_cost, 0)
    )

    const budgetPercent = computed(() =>
      budget.value > 0 ? Math.min(100, Math.round((totalCost.value / budget.value) * 100)) : 0
    )

    const loadData = async () => {
      try {
        loading.value = true
        const [forecasts, inventory] = await Promise.all([
          api.getDemandForecasts(),
          api.getInventory({})
        ])
        allForecasts.value = forecasts
        inventoryItems.value = inventory
      } catch (err) {
        error.value = 'Failed to load data: ' + err.message
      } finally {
        loading.value = false
      }
    }

    const placeOrder = async () => {
      if (recommendedItems.value.length === 0) return
      try {
        submitting.value = true
        submitted.value = false
        const items = recommendedItems.value.map(item => ({
          sku: item.item_sku,
          name: item.item_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost
        }))
        await api.submitRestockingOrder({ items, total_value: totalCost.value })
        submitted.value = true
        budget.value = 50000
      } catch (err) {
        error.value = 'Failed to submit order: ' + err.message
      } finally {
        submitting.value = false
      }
    }

    onMounted(loadData)

    return {
      t,
      currencySymbol,
      loading,
      error,
      submitting,
      submitted,
      budget,
      recommendedItems,
      totalCost,
      budgetPercent,
      placeOrder
    }
  }
}
</script>

<style scoped>
.budget-card {
  margin-bottom: 24px;
}

.budget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.budget-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
}

.budget-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #334155;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  margin-bottom: 8px;
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid #1e40af;
}

.budget-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid #1e40af;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.item-count {
  font-size: 0.8rem;
  font-weight: 400;
  color: #64748b;
  margin-left: 8px;
}

.budget-summary {
  font-size: 0.85rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.budget-bar-wrap {
  display: inline-block;
  width: 100px;
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
}

.budget-bar {
  display: block;
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  transition: width 0.3s;
}

.restocking-table {
  table-layout: fixed;
  width: 100%;
}

.col-item  { width: 220px; }
.col-sku   { width: 110px; }
.col-qty   { width: 120px; }
.col-unit  { width: 110px; }
.col-total { width: 130px; }
.col-trend { width: 130px; }

code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.78rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 2px 6px;
  color: #7dd3fc;
}

.trend-increasing { background: #14301f; color: #4ade80; }
.trend-stable     { background: #1e3a5f; color: #60a5fa; }

.order-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #1e293b;
  margin-top: 20px;
}

.success-message {
  font-size: 0.875rem;
  color: #4ade80;
  font-weight: 500;
}

.place-order-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 24px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.place-order-btn:hover:not(:disabled) {
  background: #2563eb;
}

.place-order-btn:disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
}

.no-items {
  padding: 32px;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}
</style>

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';

type Stock = {
  id: string;
  name: string;
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: 'USD' | 'KRW';
};

type Saving = {
  id: string;
  name: string;
  bank: string;
  monthlyAmount: number;
  startDate: string;
  maturityDate: string;
  interestOnMaturity: number;
};

type Snapshot = {
  year: number;
  age: number;
  totalAsset: number;
};

const TARGET_YEAR = 2040;
const TARGET_ASSET = 1_500_000_000;
const BIRTH_YEAR = 2004;
const START_YEAR = 2024;
const START_AGE = START_YEAR - BIRTH_YEAR;
const TARGET_AGE = TARGET_YEAR - BIRTH_YEAR;

const today = new Date();
const CURRENT_YEAR = today.getFullYear();
const CURRENT_AGE = CURRENT_YEAR - BIRTH_YEAR;

const defaultStocks: Stock[] = [
  {
    id: 'stock-1',
    name: 'Tesla',
    ticker: 'TSLA',
    quantity: 3.2,
    averagePrice: 180,
    currentPrice: 245,
    currency: 'USD',
  },
];

const defaultSavings: Saving[] = [
  {
    id: 'saving-1',
    name: '청년도약계좌',
    bank: '은행',
    monthlyAmount: 700_000,
    startDate: '2026-01-15',
    maturityDate: '2031-01-15',
    interestOnMaturity: 3_800_000,
  },
];

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('ko-KR');
}

function formatPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function monthsElapsed(startDate: string, endDate: Date) {
  const start = new Date(startDate);

  let months =
    (endDate.getFullYear() - start.getFullYear()) * 12 +
    (endDate.getMonth() - start.getMonth()) +
    1;

  if (endDate.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function savingPrincipal(saving: Saving) {
  const maturity = new Date(saving.maturityDate);
  const end = today > maturity ? maturity : today;
  const months = monthsElapsed(saving.startDate, end);

  return months * saving.monthlyAmount;
}

function targetAssetByAge(age: number) {
  const progress = (age - START_AGE) / (TARGET_AGE - START_AGE);

  if (progress <= 0) return 0;
  if (progress >= 1) return TARGET_ASSET;

  return TARGET_ASSET * Math.pow(progress, 2.15);
}

function makePath(
  points: { x: number; y: number | null }[],
  width: number,
  height: number,
  maxY: number
) {
  const usableWidth = width - 40;
  const usableHeight = height - 40;

  const validPoints = points.filter((point) => point.y !== null);

  return validPoints
    .map((point, index) => {
      const x = 20 + point.x * usableWidth;
      const y = 20 + usableHeight - ((point.y || 0) / maxY) * usableHeight;

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export default function Home() {
  const [cash, setCash] = useState(2_380_000);
  const [exchangeRate, setExchangeRate] = useState(1380);
  const [stocks, setStocks] = useState<Stock[]>(defaultStocks);
  const [savings, setSavings] = useState<Saving[]>(defaultSavings);
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([
    { year: 2024, age: 20, totalAsset: 0 },
    { year: 2025, age: 21, totalAsset: 4_200_000 },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('asset-orbit-data');

    if (!saved) {
      setHasHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setCash(parsed.cash ?? 2_380_000);
      setExchangeRate(parsed.exchangeRate ?? 1380);
      setStocks(parsed.stocks ?? defaultStocks);
      setSavings(parsed.savings ?? defaultSavings);
      setApiKey(parsed.apiKey ?? '');
      setSnapshots(parsed.snapshots ?? []);
      setLastUpdated(parsed.lastUpdated ?? '');
      setHasHydrated(true);
    } catch {
      console.log('저장 데이터 불러오기 실패');
    }
  }, []);

  const stockAsset = useMemo(() => {
    return stocks.reduce((sum, stock) => {
      const price =
        stock.currency === 'USD'
          ? stock.currentPrice * exchangeRate
          : stock.currentPrice;

      return sum + price * stock.quantity;
    }, 0);
  }, [stocks, exchangeRate]);

  const savingAsset = useMemo(() => {
    return savings.reduce((sum, saving) => {
      return sum + savingPrincipal(saving);
    }, 0);
  }, [savings]);

  const totalAsset = cash + stockAsset + savingAsset;
  const currentTargetAsset = targetAssetByAge(CURRENT_AGE);
  const gap = totalAsset - currentTargetAsset;
  const gapRate =
    currentTargetAsset === 0 ? 0 : (gap / currentTargetAsset) * 100;

  useEffect(() => {
    const todaySnapshot: Snapshot = {
      year: CURRENT_YEAR,
      age: CURRENT_AGE,
      totalAsset,
    };

    setSnapshots((prev) => {
      const withoutToday = prev.filter(
        (snapshot) => snapshot.year !== CURRENT_YEAR
      );

      return [...withoutToday, todaySnapshot].sort((a, b) => a.year - b.year);
    });
  }, [totalAsset]);

  useEffect(() => {
    localStorage.setItem(
      'asset-orbit-data',
      JSON.stringify({
        cash,
        exchangeRate,
        stocks,
        savings,
        apiKey,
        snapshots,
        lastUpdated,
      })
    );
  }, [cash, exchangeRate, stocks, savings, apiKey, snapshots, lastUpdated]);

  async function refreshStockPrices(showMissingKeyAlert = true) {
    if (!apiKey.trim()) {
      if (showMissingKeyAlert) {
        alert('Finnhub API Key를 먼저 입력해야 합니다.');
      }
      return;
    }

    setIsRefreshing(true);

    try {
      const updatedStocks = await Promise.all(
        stocks.map(async (stock) => {
          if (!stock.ticker.trim()) return stock;

          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stock.ticker.trim()}&token=${apiKey.trim()}`
          );

          const data = await response.json();

          if (!data.c) return stock;

          return {
            ...stock,
            currentPrice: data.c,
          };
        })
      );

      setStocks(updatedStocks);
      setLastUpdated(new Date().toLocaleString('ko-KR'));
    } catch {
      alert('주식 현재가 업데이트에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }
  useEffect(() => {
    if (!hasHydrated) return;
    if (!apiKey.trim()) return;

    refreshStockPrices(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  function updateStock(id: string, patch: Partial<Stock>) {
    setStocks((prev) =>
      prev.map((stock) => (stock.id === id ? { ...stock, ...patch } : stock))
    );
  }

  function updateSaving(id: string, patch: Partial<Saving>) {
    setSavings((prev) =>
      prev.map((saving) =>
        saving.id === id ? { ...saving, ...patch } : saving
      )
    );
  }

  function addStock() {
    setStocks((prev) => [
      ...prev,
      {
        id: createId('stock'),
        name: '새 주식',
        ticker: '',
        quantity: 0,
        averagePrice: 0,
        currentPrice: 0,
        currency: 'USD',
      },
    ]);
  }

  function removeStock(id: string) {
    const ok = confirm('이 주식을 삭제할까요?');

    if (!ok) return;

    setStocks((prev) => prev.filter((stock) => stock.id !== id));
  }

  function addSaving() {
    setSavings((prev) => [
      ...prev,
      {
        id: createId('saving'),
        name: '새 적금',
        bank: '은행',
        monthlyAmount: 0,
        startDate: new Date().toISOString().slice(0, 10),
        maturityDate: '2030-12-31',
        interestOnMaturity: 0,
      },
    ]);
  }

  function removeSaving(id: string) {
    const ok = confirm('이 적금을 삭제할까요?');

    if (!ok) return;

    setSavings((prev) => prev.filter((saving) => saving.id !== id));
  }
  function exportBackup() {
    const backup = {
      app: 'asset-orbit',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        cash,
        exchangeRate,
        stocks,
        savings,
        snapshots,
        lastUpdated,
      },
    };
  
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
  
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
  
    link.href = url;
    link.download = `asset-orbit-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
  
    document.body.appendChild(link);
    link.click();
    link.remove();
  
    URL.revokeObjectURL(url);
  }
  
  function openBackupFilePicker() {
    fileInputRef.current?.click();
  }
  
  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
  
    if (!file) return;
  
    const reader = new FileReader();
  
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
  
        if (parsed.app !== 'asset-orbit' || !parsed.data) {
          alert('자산궤도 백업 파일이 아닙니다.');
          return;
        }
  
        const ok = confirm(
          '백업 데이터를 가져오면 현재 입력된 자산 데이터가 백업 파일 내용으로 교체됩니다. 계속할까요?'
        );
  
        if (!ok) return;
  
        setCash(parsed.data.cash ?? 0);
        setExchangeRate(parsed.data.exchangeRate ?? 1380);
        setStocks(parsed.data.stocks ?? []);
        setSavings(parsed.data.savings ?? []);
        setSnapshots(parsed.data.snapshots ?? []);
        setLastUpdated(parsed.data.lastUpdated ?? '');
  
        alert('백업 데이터를 복원했습니다. Finnhub API Key는 다시 입력해야 합니다.');
      } catch {
        alert('백업 파일을 읽는 데 실패했습니다.');
      } finally {
        event.target.value = '';
      }
    };
  
    reader.readAsText(file);
  }

  const chartWidth = 360;
  const chartHeight = 260;

  const ages = Array.from(
    { length: TARGET_AGE - START_AGE + 1 },
    (_, index) => START_AGE + index
  );

  const chartData = ages.map((age, index) => {
    const year = BIRTH_YEAR + age;
    const snapshot = snapshots.find((item) => item.year === year);

    return {
      age,
      x: index / (ages.length - 1),
      targetAsset: targetAssetByAge(age),
      actualAsset: age <= CURRENT_AGE ? snapshot?.totalAsset ?? null : null,
    };
  });

  const targetPath = makePath(
    chartData.map((item) => ({ x: item.x, y: item.targetAsset })),
    chartWidth,
    chartHeight,
    TARGET_ASSET
  );

  const actualPath = makePath(
    chartData.map((item) => ({ x: item.x, y: item.actualAsset })),
    chartWidth,
    chartHeight,
    TARGET_ASSET
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, #17233f 0%, #070b14 45%, #05070d 100%)',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '20px',
      }}
    >
      <section style={{ maxWidth: 430, margin: '0 auto' }}>
        <header style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 6 }}>
            2040년 15억 목표
          </div>
          <h1
            style={{
              fontSize: 30,
              margin: 0,
              letterSpacing: '-0.04em',
            }}
          >
            자산궤도
          </h1>
        </header>

        <section
          style={{
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: 28,
            padding: 20,
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#94a3b8', fontSize: 14 }}>현재 총자산</div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: '-0.05em',
                marginTop: 4,
              }}
            >
              {formatWon(totalAsset)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <StatusCard
              label="목표 필요 자산"
              value={formatWon(currentTargetAsset)}
            />
            <StatusCard
              label={gap >= 0 ? '목표 초과' : '목표 부족'}
              value={formatWon(Math.abs(gap))}
              accent={gap >= 0}
            />
          </div>

          <div
            style={{
              background: 'rgba(2, 6, 23, 0.7)',
              borderRadius: 22,
              padding: '14px 8px 8px',
              marginBottom: 16,
            }}
          >
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width="100%"
              height="260"
              role="img"
              aria-label="자산궤도 그래프"
            >
              {[0.25, 0.5, 0.75, 1].map((line) => (
                <line
                  key={line}
                  x1="20"
                  x2={chartWidth - 20}
                  y1={20 + (chartHeight - 40) * line}
                  y2={20 + (chartHeight - 40) * line}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeWidth="1"
                />
              ))}

              <path
                d={targetPath}
                fill="none"
                stroke="rgba(148, 163, 184, 0.85)"
                strokeWidth="3"
                strokeDasharray="8 8"
                strokeLinecap="round"
              />

              <path
                d={actualPath}
                fill="none"
                stroke="#f8fafc"
                strokeWidth="5"
                strokeLinecap="round"
              />

              <text x="20" y="250" fill="#64748b" fontSize="11">
                {START_AGE}세
              </text>
              <text x="286" y="250" fill="#64748b" fontSize="11">
                {TARGET_AGE}세 / 2040년
              </text>
            </svg>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 18,
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              <span>━ 실제 자산</span>
              <span>┅ 목표 궤도</span>
            </div>
          </div>

          <div
            style={{
              background:
                gap >= 0
                  ? 'rgba(59, 130, 246, 0.16)'
                  : 'rgba(148, 163, 184, 0.14)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.6 }}>
              현재 목표 궤도보다{' '}
              <strong style={{ color: '#fff' }}>
                {formatPercent(gapRate)}
              </strong>{' '}
              {gap >= 0 ? '앞서 있습니다.' : '부족합니다.'}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              width: '100%',
              border: 0,
              borderRadius: 18,
              padding: '15px 16px',
              background: '#f8fafc',
              color: '#020617',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {isEditing ? '수정 닫기' : '자산 수정'}
          </button>
        </section>

        <section style={sectionStyle}>
          <details>
            <summary style={summaryStyle}>자산 상세 보기</summary>

            <div style={assetSummaryGrid}>
              <SmallAssetCard label="현금" value={formatWon(cash)} />
              <SmallAssetCard label="주식" value={formatWon(stockAsset)} />
              <SmallAssetCard
                label="적금 원금"
                value={formatWon(savingAsset)}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <h3>주식</h3>
              {stocks.length === 0 && (
                <p style={mutedText}>등록된 주식이 없습니다.</p>
              )}
              {stocks.map((stock) => {
                const unitPrice =
                  stock.currency === 'USD'
                    ? stock.currentPrice * exchangeRate
                    : stock.currentPrice;

                const evaluation = unitPrice * stock.quantity;

                return (
                  <div key={stock.id} style={detailRow}>
                    <div>
                      <strong>{stock.name}</strong>
                      <div style={mutedText}>
                        {stock.ticker || '티커 없음'} · {stock.quantity}주
                      </div>
                    </div>
                    <strong>{formatWon(evaluation)}</strong>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 14 }}>
              <h3>적금</h3>
              {savings.length === 0 && (
                <p style={mutedText}>등록된 적금이 없습니다.</p>
              )}
              {savings.map((saving) => (
                <div key={saving.id} style={detailRow}>
                  <div>
                    <strong>{saving.name}</strong>
                    <div style={mutedText}>
                      월 {formatWon(saving.monthlyAmount)}
                    </div>
                  </div>
                  <strong>{formatWon(savingPrincipal(saving))}</strong>
                </div>
              ))}
            </div>
          </details>
        </section>

        {isEditing && (
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>자산 수정</h2>

            <NumberInput label="현금" value={cash} onChange={setCash} />
            <NumberInput
              label="달러 환율"
              value={exchangeRate}
              onChange={setExchangeRate}
            />

            <Divider />

            <h3>주식</h3>
            <p style={mutedText}>
              보유 주수는 대표님이 직접 수정하고, 현재가는 API로 업데이트합니다.
            </p>

            <TextInput
              label="Finnhub API Key"
              value={apiKey}
              onChange={setApiKey}
              placeholder="API Key 입력"
            />

            <button
              onClick={() => refreshStockPrices(true)}
              disabled={isRefreshing}
              style={{
                ...secondaryButtonStyle,
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              {isRefreshing ? '시세 업데이트 중...' : '주식 현재가 업데이트'}
            </button>

            {lastUpdated && (
              <p style={mutedText}>마지막 업데이트: {lastUpdated}</p>
            )}

            {stocks.map((stock) => (
              <div key={stock.id} style={editCardStyle}>
                <div style={cardHeader}>
                  <strong>{stock.name}</strong>
                  <button
                    onClick={() => removeStock(stock.id)}
                    style={deleteButtonStyle}
                  >
                    삭제
                  </button>
                </div>

                <TextInput
                  label="종목명"
                  value={stock.name}
                  onChange={(value) => updateStock(stock.id, { name: value })}
                />

                <TextInput
                  label="티커"
                  value={stock.ticker}
                  onChange={(value) =>
                    updateStock(stock.id, { ticker: value.toUpperCase() })
                  }
                />

                <NumberInput
                  label="보유 주수"
                  value={stock.quantity}
                  onChange={(value) =>
                    updateStock(stock.id, { quantity: value })
                  }
                />

                <NumberInput
                  label="평균단가"
                  value={stock.averagePrice}
                  onChange={(value) =>
                    updateStock(stock.id, { averagePrice: value })
                  }
                />

                <NumberInput
                  label="현재가"
                  value={stock.currentPrice}
                  onChange={(value) =>
                    updateStock(stock.id, { currentPrice: value })
                  }
                />

                <label style={labelStyle}>
                  <div style={labelTextStyle}>통화</div>
                  <select
                    value={stock.currency}
                    onChange={(event) =>
                      updateStock(stock.id, {
                        currency: event.target.value as 'USD' | 'KRW',
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="USD">USD</option>
                    <option value="KRW">KRW</option>
                  </select>
                </label>
              </div>
            ))}

            <button onClick={addStock} style={secondaryButtonStyle}>
              주식 추가
            </button>

            <Divider />

            <h3>적금</h3>
            <p style={mutedText}>
              월 납입액과 시작일 기준으로 납입 원금이 자동 반영됩니다.
            </p>

            {savings.map((saving) => (
              <div key={saving.id} style={editCardStyle}>
                <div style={cardHeader}>
                  <strong>{saving.name}</strong>
                  <button
                    onClick={() => removeSaving(saving.id)}
                    style={deleteButtonStyle}
                  >
                    삭제
                  </button>
                </div>

                <TextInput
                  label="상품명"
                  value={saving.name}
                  onChange={(value) => updateSaving(saving.id, { name: value })}
                />

                <TextInput
                  label="은행명"
                  value={saving.bank}
                  onChange={(value) => updateSaving(saving.id, { bank: value })}
                />

                <NumberInput
                  label="월 납입액"
                  value={saving.monthlyAmount}
                  onChange={(value) =>
                    updateSaving(saving.id, { monthlyAmount: value })
                  }
                />

                <DateInput
                  label="시작일"
                  value={saving.startDate}
                  onChange={(value) =>
                    updateSaving(saving.id, { startDate: value })
                  }
                />

                <DateInput
                  label="만기일"
                  value={saving.maturityDate}
                  onChange={(value) =>
                    updateSaving(saving.id, { maturityDate: value })
                  }
                />

                <NumberInput
                  label="만기 예상 이자"
                  value={saving.interestOnMaturity}
                  onChange={(value) =>
                    updateSaving(saving.id, { interestOnMaturity: value })
                  }
                />
              </div>
            ))}

            <button onClick={addSaving} style={secondaryButtonStyle}>
              적금 추가
            </button>
          </section>
        )}

        <section style={sectionStyle}>
          <h3 style={{ marginTop: 0 }}>예정 입금</h3>

          {savings.length === 0 && (
            <p style={mutedText}>등록된 적금 만기 예정이 없습니다.</p>
          )}

          {savings.map((saving) => (
            <div key={saving.id} style={detailRow}>
              <div>
                <div>{saving.maturityDate}</div>
                <div style={mutedText}>{saving.name}</div>
              </div>
              <strong>+{formatWon(saving.interestOnMaturity)}</strong>
            </div>
          ))}
        </section>
      </section>
      <section style={sectionStyle}>
  <h3 style={{ marginTop: 0 }}>데이터 백업</h3>

  <p style={mutedText}>
    현재 입력된 현금, 주식, 적금, 자산 기록을 JSON 파일로 저장하고 나중에 다시 복원할 수 있습니다.
    Finnhub API Key는 보안상 백업에 포함하지 않습니다.
  </p>

  <button onClick={exportBackup} style={secondaryButtonStyle}>
    데이터 내보내기
  </button>

  <button onClick={openBackupFilePicker} style={secondaryButtonStyle}>
    데이터 가져오기
  </button>

  <input
    ref={fileInputRef}
    type="file"
    accept="application/json,.json"
    onChange={importBackup}
    style={{ display: 'none' }}
  />
</section>
    </main>
  );
}

function StatusCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(2, 6, 23, 0.55)',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        borderRadius: 18,
        padding: 14,
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 15,
          fontWeight: 800,
          color: accent ? '#bfdbfe' : '#f8fafc',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SmallAssetCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(2, 6, 23, 0.52)',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        borderRadius: 16,
        padding: 12,
      }}
    >
      <div style={mutedText}>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={labelStyle}>
      <div style={labelTextStyle}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={inputStyle}
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={labelStyle}>
      <div style={labelTextStyle}>{label}</div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={labelStyle}>
      <div style={labelTextStyle}>{label}</div>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(148, 163, 184, 0.14)',
        margin: '22px 0',
      }}
    />
  );
}

const sectionStyle = {
  marginTop: 16,
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid rgba(148, 163, 184, 0.12)',
  borderRadius: 24,
  padding: 18,
};

const summaryStyle = {
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 16,
};

const assetSummaryGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 10,
  marginTop: 16,
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  borderTop: '1px solid rgba(148, 163, 184, 0.12)',
  paddingTop: 12,
  marginTop: 12,
};

const mutedText = {
  color: '#94a3b8',
  fontSize: 13,
};

const labelStyle = {
  display: 'block',
  marginTop: 12,
};

const labelTextStyle = {
  color: '#94a3b8',
  fontSize: 13,
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(2, 6, 23, 0.7)',
  color: '#f8fafc',
  borderRadius: 14,
  padding: '13px 14px',
  fontSize: 15,
  outline: 'none',
};

const secondaryButtonStyle = {
  width: '100%',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  background: 'rgba(148, 163, 184, 0.12)',
  color: '#f8fafc',
  borderRadius: 14,
  padding: '13px 14px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 10,
};

const deleteButtonStyle = {
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'rgba(15, 23, 42, 0.8)',
  color: '#cbd5e1',
  borderRadius: 999,
  padding: '7px 10px',
  fontSize: 12,
  cursor: 'pointer',
};

const editCardStyle = {
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(2, 6, 23, 0.42)',
  borderRadius: 18,
  padding: 14,
  marginTop: 12,
};

const cardHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

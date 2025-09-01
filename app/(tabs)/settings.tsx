import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TRADING_COLORS } from '@/constants/trading';
import { useTradingContext } from '@/hooks/use-trading-context';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { ModeBadge } from '@/components/ModeBadge';
import { Save, WifiOff, Wifi, ChevronDown, ChevronUp, RotateCcw, Database } from 'lucide-react-native';
import { TradingMode, Timeframe } from '@/types/trading';
import { createApiService } from '@/services/api';
import { Toast } from '@/components/Toast';

export default function SettingsScreen() {
  const { 
    mode, 
    setMode, 
    settings, 
    setSettings, 
    connectionStatus,
    testConnections 
  } = useTradingContext();

  const [localSettings, setLocalSettings] = useState(settings);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    api: true,
    signalEngine: false,
    trading: false,
    brokers: false,
  });
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [backfillSymbol, setBackfillSymbol] = useState('');
  const [backfillRange, setBackfillRange] = useState<'1h' | '4h' | '24h'>('24h');
  const [engineStatus, setEngineStatus] = useState<'running' | 'paused'>('running');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; visible: boolean }>({ message: '', type: 'info', visible: false });

  useEffect(() => {
    setLocalSettings(settings);
    checkEngineStatus();
  }, [settings]);

  const checkEngineStatus = async () => {
    try {
      const apiService = createApiService(settings.restApiUrl);
      const status = await apiService.getStatus();
      setEngineStatus(status.engine.running ? 'running' : 'paused');
    } catch (error) {
      console.log('Failed to check engine status:', error);
      setEngineStatus('paused');
    }
  };

  const handleSave = async () => {
    setSettings(localSettings);
    const status = await testConnections();
    
    // Send signal engine config to backend
    try {
      const response = await fetch(`${localSettings.restApiUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable_signals: localSettings.signalEngine.enableSignals,
          timeframes: localSettings.signalEngine.timeframes,
          min_lookback_bars: localSettings.signalEngine.minLookbackBars,
          confluence_threshold: localSettings.signalEngine.confluenceThreshold / 100, // Convert to decimal
        })
      });
      
      if (response.ok) {
        console.log('Signal engine config updated');
        checkEngineStatus();
      }
    } catch (error) {
      console.log('Failed to update signal engine config:', error);
    }
    
    Alert.alert(
      'Settings Saved',
      `Configuration updated. ${Object.values(status).filter(Boolean).length} connections active.`
    );
  };

  const handleTestConnection = async () => {
    // Test REST API
    const restOk = await (async () => {
      try {
        const url = localSettings.restApiUrl.replace(/\/$/, '') + '/health';
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) return false;
        const data = await response.json().catch(() => ({}));
        return data?.status === 'ok';
      } catch {
        return false;
      }
    })();

    // Test WebSocket
    const wsOk = await (async () => {
      try {
        const ws = new WebSocket(localSettings.wsApiUrl);
        return await new Promise<boolean>((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              try { ws.close(); } catch {}
              resolve(false);
            }
          }, 3000);
          ws.onopen = () => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              ws.close();
              resolve(true);
            }
          };
          ws.onerror = () => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(false);
            }
          };
        });
      } catch {
        return false;
      }
    })();

    const active = restOk || wsOk;
    
    let message = '';
    if (restOk && wsOk) {
      message = 'Both REST API and WebSocket connected successfully.';
    } else if (restOk && !wsOk) {
      message = 'REST API connected. WebSocket unavailable - will use polling fallback.';
    } else if (!restOk && wsOk) {
      message = 'WebSocket connected. REST API unavailable.';
    } else {
      message = 'No active connections. Check your settings and network.';
    }
    
    Alert.alert(
      active ? 'Connection Test - Success' : 'Connection Test - Failed',
      message
    );
  };

  const handleBackfillHistory = async () => {
    if (!backfillSymbol.trim()) {
      Alert.alert('Error', 'Please select a symbol');
      return;
    }

    const minutes = backfillRange === '1h' ? 60 : backfillRange === '4h' ? 240 : 1440;
    
    try {
      const response = await fetch(`${localSettings.restApiUrl}/symbols/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: backfillSymbol, lookback_minutes: minutes })
      });
      
      if (response.ok) {
        Alert.alert('Success', `Backfilled ${backfillRange} of data for ${backfillSymbol}`);
        setShowBackfillModal(false);
      } else {
        Alert.alert('Error', 'Failed to backfill data');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during backfill');
    }
  };

  const handleRestoreDefaults = () => {
    Alert.alert(
      'Restore Defaults',
      'This will reset signal engine settings to sensible defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            setLocalSettings(prev => ({
              ...prev,
              signalEngine: {
                enableSignals: true,
                timeframes: ['1m', '5m', '15m'] as Timeframe[],
                minLookbackBars: 50,
                confluenceThreshold: 35,
              }
            }));
          }
        }
      ]
    );
  };

  const toggleTimeframe = (tf: Timeframe) => {
    const current = localSettings.signalEngine.timeframes;
    const updated = current.includes(tf) 
      ? current.filter(t => t !== tf)
      : [...current, tf];
    
    if (updated.length === 0) {
      Alert.alert('Error', 'At least one timeframe must be selected');
      return;
    }
    
    setLocalSettings(prev => ({
      ...prev,
      signalEngine: {
        ...prev.signalEngine,
        timeframes: updated
      }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSectionHeader = (title: string, section: string, connected?: boolean) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {connected !== undefined && <ConnectionIndicator connected={connected} />}
      </View>
      {expandedSections[section] ? 
        <ChevronUp size={20} color={TRADING_COLORS.textSecondary} /> :
        <ChevronDown size={20} color={TRADING_COLORS.textSecondary} />
      }
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <ModeBadge mode={mode} />
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Trading Mode */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trading Mode</Text>
            <View style={styles.modeSelector}>
              {(['signals', 'paper', 'live'] as TradingMode[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeOption, mode === m && styles.modeOptionActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* API Configuration */}
          <View style={styles.card}>
            {renderSectionHeader('API Configuration', 'api', connectionStatus.api || connectionStatus.websocket)}
            
            {expandedSections.api && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Backend</Text>
                  <Text style={styles.backendUrl}>{localSettings.restApiUrl}</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>REST API URL</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.restApiUrl}
                    onChangeText={text => setLocalSettings({ ...localSettings, restApiUrl: text })}
                    placeholder="https://api.example.com/api"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WebSocket URL</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.wsApiUrl}
                    onChangeText={text => setLocalSettings({ ...localSettings, wsApiUrl: text })}
                    placeholder="wss://api.example.com/api/ws"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity style={styles.testButton} onPress={handleTestConnection}>
                  {connectionStatus.api || connectionStatus.websocket ? 
                    <Wifi size={16} color={TRADING_COLORS.text} /> :
                    <WifiOff size={16} color={TRADING_COLORS.text} />
                  }
                  <Text style={styles.testButtonText}>Test Connection</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Signal Engine */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Signal Engine</Text>
                <View style={[styles.statusPill, engineStatus === 'running' ? styles.statusRunning : styles.statusPaused]}>
                  <Text style={[styles.statusText, engineStatus === 'running' ? styles.statusTextRunning : styles.statusTextPaused]}>
                    {engineStatus === 'running' ? 'Running' : 'Paused'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSection('signalEngine')}>
                {expandedSections.signalEngine ? 
                  <ChevronUp size={20} color={TRADING_COLORS.textSecondary} /> :
                  <ChevronDown size={20} color={TRADING_COLORS.textSecondary} />
                }
              </TouchableOpacity>
            </View>
            
            {expandedSections.signalEngine && (
              <View style={styles.sectionContent}>
                <View style={styles.switchGroup}>
                  <Text style={styles.inputLabel}>Enable Signal Generation</Text>
                  <Switch
                    value={localSettings.signalEngine.enableSignals}
                    onValueChange={value => {
                      setLocalSettings(prev => ({
                        ...prev,
                        signalEngine: { ...prev.signalEngine, enableSignals: value }
                      }));
                      setToast({
                        message: `Signal Engine: ${value ? 'ON' : 'OFF'}`,
                        type: value ? 'success' : 'warning',
                        visible: true
                      });
                    }}
                    trackColor={{ false: TRADING_COLORS.border, true: TRADING_COLORS.primary }}
                    thumbColor={TRADING_COLORS.text}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Timeframes</Text>
                  <View style={styles.timeframeSelector}>
                    {(['1m', '5m', '15m'] as Timeframe[]).map(tf => (
                      <TouchableOpacity
                        key={tf}
                        style={[
                          styles.timeframeOption,
                          localSettings.signalEngine.timeframes.includes(tf) && styles.timeframeOptionActive
                        ]}
                        onPress={() => toggleTimeframe(tf)}
                      >
                        <Text style={[
                          styles.timeframeText,
                          localSettings.signalEngine.timeframes.includes(tf) && styles.timeframeTextActive
                        ]}>
                          {tf}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Min Lookback Bars</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.signalEngine.minLookbackBars.toString()}
                    onChangeText={text => setLocalSettings(prev => ({
                      ...prev,
                      signalEngine: {
                        ...prev.signalEngine,
                        minLookbackBars: parseInt(text) || 50
                      }
                    }))}
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confluence Threshold (%)</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderValue}>{localSettings.signalEngine.confluenceThreshold}%</Text>
                    <TextInput
                      style={styles.input}
                      value={localSettings.signalEngine.confluenceThreshold.toString()}
                      onChangeText={text => {
                        const value = Math.max(20, Math.min(90, parseInt(text) || 35));
                        setLocalSettings(prev => ({
                          ...prev,
                          signalEngine: {
                            ...prev.signalEngine,
                            confluenceThreshold: value
                          }
                        }));
                      }}
                      keyboardType="numeric"
                      placeholder="35"
                      placeholderTextColor={TRADING_COLORS.textSecondary}
                    />
                  </View>
                  <Text style={styles.helperText}>Range: 20-90%</Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => setShowBackfillModal(true)}
                  >
                    <Database size={16} color={TRADING_COLORS.text} />
                    <Text style={styles.actionButtonText}>Backfill History</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleRestoreDefaults}
                  >
                    <RotateCcw size={16} color={TRADING_COLORS.text} />
                    <Text style={styles.actionButtonText}>Restore Defaults</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.helperText}>
                  Requires ≥ {localSettings.signalEngine.minLookbackBars} bars on {localSettings.signalEngine.timeframes.join('/')}
                </Text>
              </View>
            )}
          </View>

          {/* Trading Parameters */}
          <View style={styles.card}>
            {renderSectionHeader('Trading Parameters', 'trading')}
            
            {expandedSections.trading && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Daily Loss Cap ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={Math.abs(localSettings.dailyLossCap).toString()}
                    onChangeText={text => setLocalSettings({ 
                      ...localSettings, 
                      dailyLossCap: -Math.abs(parseFloat(text) || 0) 
                    })}
                    keyboardType="numeric"
                    placeholder="200"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Daily Profit Cap ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.dailyProfitCap.toString()}
                    onChangeText={text => setLocalSettings({ 
                      ...localSettings, 
                      dailyProfitCap: parseFloat(text) || 0 
                    })}
                    keyboardType="numeric"
                    placeholder="7500"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Max Trades per Day</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.maxTradesPerDay.toString()}
                    onChangeText={text => setLocalSettings({ 
                      ...localSettings, 
                      maxTradesPerDay: parseInt(text) || 0 
                    })}
                    keyboardType="numeric"
                    placeholder="4"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Risk per Trade ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.riskPerTrade.toString()}
                    onChangeText={text => setLocalSettings({ 
                      ...localSettings, 
                      riskPerTrade: parseFloat(text) || 0 
                    })}
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confluence Threshold (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.confluenceThreshold.toString()}
                    onChangeText={text => setLocalSettings({ 
                      ...localSettings, 
                      confluenceThreshold: parseFloat(text) || 0 
                    })}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <Text style={styles.inputLabel}>Voice Prompts</Text>
                  <Switch
                    value={localSettings.voiceEnabled}
                    onValueChange={value => setLocalSettings({ ...localSettings, voiceEnabled: value })}
                    trackColor={{ false: TRADING_COLORS.border, true: TRADING_COLORS.primary }}
                    thumbColor={TRADING_COLORS.text}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <Text style={styles.inputLabel}>Sound Alerts</Text>
                  <Switch
                    value={localSettings.soundEnabled}
                    onValueChange={value => setLocalSettings({ ...localSettings, soundEnabled: value })}
                    trackColor={{ false: TRADING_COLORS.border, true: TRADING_COLORS.primary }}
                    thumbColor={TRADING_COLORS.text}
                  />
                </View>

                <View style={styles.switchGroup}>
                  <Text style={styles.inputLabel}>Push Notifications</Text>
                  <Switch
                    value={localSettings.pushEnabled}
                    onValueChange={value => setLocalSettings({ ...localSettings, pushEnabled: value })}
                    trackColor={{ false: TRADING_COLORS.border, true: TRADING_COLORS.primary }}
                    thumbColor={TRADING_COLORS.text}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Broker Credentials */}
          <View style={styles.card}>
            {renderSectionHeader('Broker Credentials', 'brokers')}
            
            {expandedSections.brokers && (
              <View style={styles.sectionContent}>
                {/* Webull */}
                <View style={styles.brokerSection}>
                  <View style={styles.brokerHeader}>
                    <Text style={styles.brokerName}>Webull</Text>
                    <ConnectionIndicator connected={connectionStatus.webull} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.webull?.apiKey || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        webull: { 
                          apiKey: text,
                          apiSecret: localSettings.brokerCredentials.webull?.apiSecret || ''
                        }
                      }
                    })}
                    placeholder="API Key"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.webull?.apiSecret || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        webull: { 
                          apiKey: localSettings.brokerCredentials.webull?.apiKey || '',
                          apiSecret: text 
                        }
                      }
                    })}
                    placeholder="API Secret"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                </View>

                {/* TopstepX */}
                <View style={styles.brokerSection}>
                  <View style={styles.brokerHeader}>
                    <Text style={styles.brokerName}>TopstepX</Text>
                    <ConnectionIndicator connected={connectionStatus.topstep} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.topstep?.apiKey || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        topstep: { 
                          apiKey: text,
                          apiSecret: localSettings.brokerCredentials.topstep?.apiSecret || ''
                        }
                      }
                    })}
                    placeholder="API Key"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.topstep?.apiSecret || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        topstep: { 
                          apiKey: localSettings.brokerCredentials.topstep?.apiKey || '',
                          apiSecret: text 
                        }
                      }
                    })}
                    placeholder="API Secret"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                </View>

                {/* Coinbase */}
                <View style={styles.brokerSection}>
                  <View style={styles.brokerHeader}>
                    <Text style={styles.brokerName}>Coinbase</Text>
                    <ConnectionIndicator connected={connectionStatus.coinbase} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.coinbase?.apiKey || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        coinbase: { 
                          apiKey: text,
                          apiSecret: localSettings.brokerCredentials.coinbase?.apiSecret || ''
                        }
                      }
                    })}
                    placeholder="API Key"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.coinbase?.apiSecret || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        coinbase: { 
                          apiKey: localSettings.brokerCredentials.coinbase?.apiKey || '',
                          apiSecret: text 
                        }
                      }
                    })}
                    placeholder="API Secret"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                </View>

                {/* OANDA */}
                <View style={styles.brokerSection}>
                  <View style={styles.brokerHeader}>
                    <Text style={styles.brokerName}>OANDA</Text>
                    <ConnectionIndicator connected={connectionStatus.oanda} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.oanda?.apiKey || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        oanda: { 
                          apiKey: text,
                          accountId: localSettings.brokerCredentials.oanda?.accountId || ''
                        }
                      }
                    })}
                    placeholder="API Key"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={localSettings.brokerCredentials.oanda?.accountId || ''}
                    onChangeText={text => setLocalSettings({
                      ...localSettings,
                      brokerCredentials: {
                        ...localSettings.brokerCredentials,
                        oanda: { 
                          apiKey: localSettings.brokerCredentials.oanda?.apiKey || '',
                          accountId: text 
                        }
                      }
                    })}
                    placeholder="Account ID"
                    placeholderTextColor={TRADING_COLORS.textSecondary}
                    autoCapitalize="none"
                    secureTextEntry
                  />
                </View>
              </View>
            )}
          </View>

          {/* TradingView */}
          <View style={styles.card}>
            <View style={styles.brokerHeader}>
              <Text style={styles.cardTitle}>TradingView</Text>
              <ConnectionIndicator connected={connectionStatus.tradingView} />
            </View>
            <TextInput
              style={styles.input}
              value={localSettings.tradingViewApiKey}
              onChangeText={text => setLocalSettings({ ...localSettings, tradingViewApiKey: text })}
              placeholder="API Key"
              placeholderTextColor={TRADING_COLORS.textSecondary}
              autoCapitalize="none"
              secureTextEntry
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Backfill Modal */}
        <Modal
          visible={showBackfillModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBackfillModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Backfill History</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Symbol</Text>
                <TextInput
                  style={styles.input}
                  value={backfillSymbol}
                  onChangeText={setBackfillSymbol}
                  placeholder="Enter symbol (e.g., BTCUSD)"
                  placeholderTextColor={TRADING_COLORS.textSecondary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Range</Text>
                <View style={styles.rangeSelector}>
                  {(['1h', '4h', '24h'] as const).map(range => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.rangeOption,
                        backfillRange === range && styles.rangeOptionActive
                      ]}
                      onPress={() => setBackfillRange(range)}
                    >
                      <Text style={[
                        styles.rangeText,
                        backfillRange === range && styles.rangeTextActive
                      ]}>
                        {range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButtonCancel} 
                  onPress={() => setShowBackfillModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalButtonConfirm} 
                  onPress={handleBackfillHistory}
                >
                  <Text style={styles.modalButtonTextConfirm}>Backfill</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Save size={20} color={TRADING_COLORS.text} />
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
        
        {/* Toast */}
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TRADING_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: TRADING_COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  sectionContent: {
    marginTop: 12,
    gap: 12,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.surfaceLight,
    alignItems: 'center',
  },
  modeOptionActive: {
    backgroundColor: TRADING_COLORS.primary,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  modeTextActive: {
    color: TRADING_COLORS.text,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    color: TRADING_COLORS.textSecondary,
  },
  input: {
    backgroundColor: TRADING_COLORS.surfaceLight,
    padding: 12,
    borderRadius: 6,
    color: TRADING_COLORS.text,
    fontSize: 14,
  },
  testButton: {
    backgroundColor: TRADING_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  testButtonText: {
    color: TRADING_COLORS.text,
    fontWeight: '600',
  },
  brokerSection: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  brokerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brokerName: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TRADING_COLORS.background,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: TRADING_COLORS.border,
  },
  saveButton: {
    backgroundColor: TRADING_COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveButtonText: {
    color: TRADING_COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusRunning: {
    backgroundColor: TRADING_COLORS.success + '20',
  },
  statusPaused: {
    backgroundColor: TRADING_COLORS.warning + '20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextRunning: {
    color: TRADING_COLORS.success,
  },
  statusTextPaused: {
    color: TRADING_COLORS.warning,
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  timeframeOptionActive: {
    backgroundColor: TRADING_COLORS.primary,
    borderColor: TRADING_COLORS.primary,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  timeframeTextActive: {
    color: TRADING_COLORS.text,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.primary,
    minWidth: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  helperText: {
    fontSize: 11,
    color: TRADING_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: TRADING_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TRADING_COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
    alignItems: 'center',
  },
  rangeOptionActive: {
    backgroundColor: TRADING_COLORS.primary,
    borderColor: TRADING_COLORS.primary,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  rangeTextActive: {
    color: TRADING_COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.primary,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  modalButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  backendUrl: {
    fontSize: 12,
    color: TRADING_COLORS.primary,
    fontFamily: 'monospace',
    backgroundColor: TRADING_COLORS.surfaceLight,
    padding: 8,
    borderRadius: 4,
  },
});
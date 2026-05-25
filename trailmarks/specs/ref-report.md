# trailmark: tacit-specs/dapp/
Generated: trailmark v0.3.1  |  path: `tacit-specs/dapp`
## Overview
| Metric | Value |
| --- | --- |
| Total nodes | 1792 |
| Functions + methods | 1754 |
| Call edges | 33525 |
| Node kinds | 5 |
## Node Kind Breakdown
| Kind | Count |
| --- | --- |
| function | 1747 |
| module | 30 |
| method | 7 |
| template | 7 |
| class | 1 |
## Module Dependency Graph (tacit-specs/dapp/)
```mermaid
flowchart LR
  _^[0_9a_f]{64}$__test[/^[0-9a-f]{64}$/.test]
  Array_isArray[Array.isArray]
  Date_now[Date.now]
  JSON_stringify[JSON.stringify]
  Math_ceil[Math.ceil]
  Math_floor[Math.floor]
  Math_max[Math.max]
  Number_isFinite[Number.isFinite]
  Number_isInteger[Number.isInteger]
  console_warn[console.warn]
  document_getElementById[document.getElementById]
  formHost_querySelector[formHost.querySelector]
  localStorage_getItem[localStorage.getItem]
  localStorage_setItem[localStorage.setItem]
  new_TextEncoder()_encode[new TextEncoder().encode]
  parts_push[parts.push]
  payload_slice[payload.slice]
  tacit[tacit]
  v_setUint32[v.setUint32]
  validatedSet_set[validatedSet.set]
  wallet_address[wallet.address]
  tacit -->|421| Date_now
  tacit -->|419| document_getElementById
  tacit -->|362| Number_isFinite
  tacit -->|316| Math_floor
  tacit -->|308| Number_isInteger
  tacit -->|267| Array_isArray
  tacit -->|264| payload_slice
  tacit -->|234| Math_max
  tacit -->|164| JSON_stringify
  tacit -->|146| _^[0_9a_f]{64}$__test
  tacit -->|142| v_setUint32
  tacit -->|135| formHost_querySelector
  tacit -->|115| localStorage_setItem
  tacit -->|111| validatedSet_set
  tacit -->|104| wallet_address
  tacit -->|104| parts_push
  tacit -->|100| console_warn
  tacit -->|96| localStorage_getItem
  tacit -->|96| new_TextEncoder()_encode
  tacit -->|86| Math_ceil
```
## Complexity Hotspots (global, cyclomatic >= 10)
| Function | Complexity | File |
| --- | --- | --- |
| tacit:_wireSwapTile | 1024 | tacit-specs/dapp/tacit.js:75998 |
| tacit:renderHoldings | 563 | tacit-specs/dapp/tacit.js:54418 |
| tacit:applyMarketFilters | 452 | tacit-specs/dapp/tacit.js:63849 |
| tacit:setupMixerHandlers | 419 | tacit-specs/dapp/tacit.js:36923 |
| tacit:_scanHoldingsImpl | 311 | tacit-specs/dapp/tacit.js:16254 |
| tacit:_validateOutpointSingle | 272 | tacit-specs/dapp/tacit.js:14131 |
| tacit:populateMarketBidsLadder | 227 | tacit-specs/dapp/tacit.js:74702 |
| tacit:populateMarketAssetStats | 199 | tacit-specs/dapp/tacit.js:70593 |
| tacit:setupDropsForm | 188 | tacit-specs/dapp/tacit.js:49383 |
| tacit:_submitAmmCeremonyContribution | 114 | tacit-specs/dapp/tacit.js:41352 |
| tacit:renderDiscoverCard | 111 | tacit-specs/dapp/tacit.js:59638 |
| tacit:renderPetchDiscover | 107 | tacit-specs/dapp/tacit.js:83601 |
| tacit:renderMarketPriceChartSVG | 100 | tacit-specs/dapp/tacit.js:69777 |
| tacit:renderRecentEtches | 99 | tacit-specs/dapp/tacit.js:58292 |
| tacit:_renderMarketAskForm | 94 | tacit-specs/dapp/tacit.js:81601 |
| tacit:_populateDepthChart | 93 | tacit-specs/dapp/tacit.js:72669 |
| tacit:_wireMarketBidPlace | 93 | tacit-specs/dapp/tacit.js:80938 |
| tacit:renderYourOpenOrdersHTML | 91 | tacit-specs/dapp/tacit.js:71627 |
| tacit:_wireMarketSweepSell | 90 | tacit-specs/dapp/tacit.js:80574 |
| tacit:_renderClaimTreasuryFundPanel | 87 | tacit-specs/dapp/tacit.js:51658 |
| tacit:renderMarketAssetHeader | 86 | tacit-specs/dapp/tacit.js:68900 |
| tacit:setupEtchForm | 76 | tacit-specs/dapp/tacit.js:45129 |
| tacit:renderMarketBrowseTable | 74 | tacit-specs/dapp/tacit.js:67897 |
| tacit:_autoFulfilTick | 71 | tacit-specs/dapp/tacit.js:48518 |
| tacit:_startMarketAutoRefresh | 70 | tacit-specs/dapp/tacit.js:61700 |
| tacit:setupTopupModal | 69 | tacit-specs/dapp/tacit.js:44083 |
| tacit:buildAndBroadcastCXferMulti | 68 | tacit-specs/dapp/tacit.js:26373 |
| tacit:takePreauthBidVar | 66 | tacit-specs/dapp/tacit.js:30376 |
| tacit:scanPools | 66 | tacit-specs/dapp/tacit.js:36281 |
| tacit:setupTransferForm | 65 | tacit-specs/dapp/tacit.js:46307 |
| tacit:setupWalletButtons | 63 | tacit-specs/dapp/tacit.js:44433 |
| tacit:_renderClaimDiscoverListNow | 61 | tacit-specs/dapp/tacit.js:53455 |
| tacit:_effectiveReferenceUnit | 59 | tacit-specs/dapp/tacit.js:62249 |
| tacit:init | 59 | tacit-specs/dapp/tacit.js:85913 |
| tacit:ceremonyContributeAmm | 57 | tacit-specs/dapp/tacit.js:40633 |
| tacit:_wireMarketSweepBuy | 57 | tacit-specs/dapp/tacit.js:80274 |
| tacit:verifySlotLeafOnChain | 54 | tacit-specs/dapp/tacit.js:11719 |
| tacit:setupClaimTab | 54 | tacit-specs/dapp/tacit.js:54028 |
| tacit:buildAndBroadcastSatsSend | 53 | tacit-specs/dapp/tacit.js:32915 |
| tacit:renderActivity | 53 | tacit-specs/dapp/tacit.js:57742 |
| tacit:ceremonyRender | 51 | tacit-specs/dapp/tacit.js:40047 |
| tacit:_bidTakeInsteadHandler | 51 | tacit-specs/dapp/tacit.js:73965 |
| tacit:_triggerStealthAutoScanInBackground | 49 | tacit-specs/dapp/tacit.js:15932 |
| tacit:renderMixer | 49 | tacit-specs/dapp/tacit.js:36638 |
| tacit:setupSatsSendForm | 49 | tacit-specs/dapp/tacit.js:46802 |
| tacit:takePreauthSaleBatch | 48 | tacit-specs/dapp/tacit.js:31396 |
| tacit:_scanBestBook | 48 | tacit-specs/dapp/tacit.js:72295 |
| tacit:takePreauthBid | 47 | tacit-specs/dapp/tacit.js:30047 |
| tacit:ceremonyContribute | 47 | tacit-specs/dapp/tacit.js:42078 |
| tacit:_renderGlobalTape | 47 | tacit-specs/dapp/tacit.js:61381 |
| tacit:renderWalletCard | 46 | tacit-specs/dapp/tacit.js:43674 |
| tacit:_claimRefreshDiscover | 46 | tacit-specs/dapp/tacit.js:53143 |
| tacit:_claimValidateSnapshot | 45 | tacit-specs/dapp/tacit.js:50679 |
| tacit:renderMarketBrowse | 45 | tacit-specs/dapp/tacit.js:67669 |
| tacit:getParentEnvelopeData | 43 | tacit-specs/dapp/tacit.js:15322 |
| tacit:buildAndBroadcastSlotMerge | 42 | tacit-specs/dapp/tacit.js:20111 |
| tacit:setupPetchForm | 42 | tacit-specs/dapp/tacit.js:45605 |
| tacit:primeSwapTileFromOrderbook | 42 | tacit-specs/dapp/tacit.js:74264 |
| tacit:renderHoldingsOpenOrdersHTML | 42 | tacit-specs/dapp/tacit.js:74495 |
| tacit:buildAndBroadcastSlotSplit | 41 | tacit-specs/dapp/tacit.js:19815 |
| tacit:buildAndBroadcastSlotBurn | 39 | tacit-specs/dapp/tacit.js:19105 |
| tacit:verifyAxferOffer | 39 | tacit-specs/dapp/tacit.js:27129 |
| tacit:publishPreauthBidVar | 38 | tacit-specs/dapp/tacit.js:29734 |
| tacit:takePreauthSale | 37 | tacit-specs/dapp/tacit.js:30961 |
| tacit:_startClaimReactivePoller | 37 | tacit-specs/dapp/tacit.js:52210 |
| tacit:_importDropJSON | 36 | tacit-specs/dapp/tacit.js:49225 |
| tacit:_consumeTabUrlHash | 36 | tacit-specs/dapp/tacit.js:52588 |
| tacit:buildAndBroadcastSlotRotate | 35 | tacit-specs/dapp/tacit.js:19545 |
| tacit:_wirePoolSwapForm | 35 | tacit-specs/dapp/tacit.js:43417 |
| tacit:_populateTradesTape | 35 | tacit-specs/dapp/tacit.js:73144 |
| tacit:_getUtxosViaTxHistory | 33 | tacit-specs/dapp/tacit.js:2660 |
| tacit:openDiscoverBidPanel | 33 | tacit-specs/dapp/tacit.js:60227 |
| tacit:discoverStealthFromTxid | 32 | tacit-specs/dapp/tacit.js:26142 |
| tacit:buildAndBroadcastCbtcTacWithdraw | 31 | tacit-specs/dapp/tacit.js:21701 |
| tacit:buildAndBroadcastCbtcTacWithdrawAtomic | 31 | tacit-specs/dapp/tacit.js:22931 |
| tacit:_ceremonyFetchIpfsWithFailover | 31 | tacit-specs/dapp/tacit.js:39573 |
| tacit:_bulkPrefetchAssetMetadata | 31 | tacit-specs/dapp/tacit.js:44909 |
| tacit:_processBatchedDiscoverCardVerify | 31 | tacit-specs/dapp/tacit.js:59112 |
| tacit:marketTakeIntentHandler | 30 | tacit-specs/dapp/tacit.js:82222 |
| tacit:_showWelcomeModal | 30 | tacit-specs/dapp/tacit.js:85644 |
| tacit:buildAndBroadcastCbtcTacDepositAtomic | 29 | tacit-specs/dapp/tacit.js:22652 |
| tacit:finalizeAxferVarTake | 29 | tacit-specs/dapp/tacit.js:28980 |
| tacit:setupCeremonyHandlers | 29 | tacit-specs/dapp/tacit.js:42536 |
| tacit:marketPartialFillPrompt | 29 | tacit-specs/dapp/tacit.js:82727 |
| tacit:setupNetworkSelect | 29 | tacit-specs/dapp/tacit.js:85190 |
| tacit:buildAndBroadcastTDrop | 28 | tacit-specs/dapp/tacit.js:25389 |
| tacit:fulfilBidIntentBatch | 28 | tacit-specs/dapp/tacit.js:32311 |
| tacit:startMarketLivenessPrune | 28 | tacit-specs/dapp/tacit.js:63447 |
| tacit:setupDiscoverButtons | 28 | tacit-specs/dapp/tacit.js:84909 |
| bulletproofs-plus:bppRangeVerify | 27 | tacit-specs/dapp/bulletproofs-plus.js:787 |
| tacit:publishPreauthBid | 27 | tacit-specs/dapp/tacit.js:29487 |
| tacit:resolveImageUri | 27 | tacit-specs/dapp/tacit.js:45006 |
| tacit:_crossCheckOneEntry | 27 | tacit-specs/dapp/tacit.js:48867 |
| tacit:enrichDiscoverPriceFloor | 27 | tacit-specs/dapp/tacit.js:59522 |
| tacit:_renderAtomicOffersTilesHtml | 27 | tacit-specs/dapp/tacit.js:71497 |
| tacit:bindMarketAssetHeader | 27 | tacit-specs/dapp/tacit.js:81387 |
| tacit:marketTakePreauthGroupHandler | 27 | tacit-specs/dapp/tacit.js:82995 |
| tacit:getFeeRate | 26 | tacit-specs/dapp/tacit.js:3781 |
| tacit:decodeTSlotSplitPayload | 26 | tacit-specs/dapp/tacit.js:8342 |
| tacit:fetchListedUtxoTags | 26 | tacit-specs/dapp/tacit.js:13105 |
| tacit:buildAndBroadcastWithdraw | 26 | tacit-specs/dapp/tacit.js:25054 |
| tacit:_renderCeremonyOutcomeBanners | 26 | tacit-specs/dapp/tacit.js:39754 |
| tacit:_updateMarketCellsInPlace | 26 | tacit-specs/dapp/tacit.js:62068 |
| tacit:_renderSwapProgress | 26 | tacit-specs/dapp/tacit.js:75849 |
| tacit:api | 25 | tacit-specs/dapp/tacit.js:2215 |
| tacit:decodeEnvelopeScript | 25 | tacit-specs/dapp/tacit.js:6237 |
| tacit:_reconcileOtcSettlements | 25 | tacit-specs/dapp/tacit.js:17836 |
| tacit:buildAndBroadcastCbtcTacDeposit | 25 | tacit-specs/dapp/tacit.js:21392 |
| tacit:buildAndBroadcastShareSlashClaim | 25 | tacit-specs/dapp/tacit.js:22030 |
| tacit:buildAndBroadcastLpAddPoolInit | 25 | tacit-specs/dapp/tacit.js:23182 |
| tacit:publishBidIntent | 25 | tacit-specs/dapp/tacit.js:31922 |
| tacit:_renderCeremonyCelebration | 25 | tacit-specs/dapp/tacit.js:39911 |
| tacit:setupBridgeModal | 25 | tacit-specs/dapp/tacit.js:44348 |
| tacit:_handleDropRowAction | 25 | tacit-specs/dapp/tacit.js:47401 |
| tacit:_wireDepthChartInteractivity | 25 | tacit-specs/dapp/tacit.js:73312 |
| tacit:renderDiscover | 25 | tacit-specs/dapp/tacit.js:84060 |
| tacit:getBtcUsdPrice | 24 | tacit-specs/dapp/tacit.js:2429 |
| tacit:scanInboundSlotNotes | 24 | tacit-specs/dapp/tacit.js:20436 |
| tacit:verifyDisclosure | 24 | tacit-specs/dapp/tacit.js:33446 |
| tacit:renderOffers | 24 | tacit-specs/dapp/tacit.js:57528 |
| tacit:_renderInflightPill | 24 | tacit-specs/dapp/tacit.js:60531 |
| tacit:_computeInBandBookStats | 24 | tacit-specs/dapp/tacit.js:72460 |
| tacit:setupCommandPalette | 24 | tacit-specs/dapp/tacit.js:85525 |
| tacit:encodeTSlotSplitPayload | 23 | tacit-specs/dapp/tacit.js:8252 |
| tacit:verifyMixerDepositKernelOnChain | 23 | tacit-specs/dapp/tacit.js:11656 |
| tacit:buildAndBroadcastCtacLienSplit | 23 | tacit-specs/dapp/tacit.js:22436 |
| tacit:buildAndBroadcastLpRemove | 23 | tacit-specs/dapp/tacit.js:23658 |
| tacit:buildAndBroadcastTDClaim | 23 | tacit-specs/dapp/tacit.js:25594 |
| tacit:buildAndBroadcastTDropReclaim | 23 | tacit-specs/dapp/tacit.js:25792 |
| tacit:claimAxferVarIntent | 23 | tacit-specs/dapp/tacit.js:28451 |
| tacit:buildAndBroadcastCBurn | 23 | tacit-specs/dapp/tacit.js:32614 |
| tacit:parseAirdropCSV | 23 | tacit-specs/dapp/tacit.js:33993 |
| tacit:importShareLink | 23 | tacit-specs/dapp/tacit.js:34461 |
| tacit:openPriceAlertModal | 23 | tacit-specs/dapp/tacit.js:34850 |
| tacit:_populatePoolForms | 23 | tacit-specs/dapp/tacit.js:43083 |
| tacit:_runDropCrossCheck | 23 | tacit-specs/dapp/tacit.js:48999 |
| tacit:_renderClaimResult | 23 | tacit-specs/dapp/tacit.js:51499 |
| tacit:_cancelAllOrdersHandler | 23 | tacit-specs/dapp/tacit.js:73895 |
| tacit:_localUtxoListedConflict | 22 | tacit-specs/dapp/tacit.js:13059 |
| tacit:validateOutpoint | 22 | tacit-specs/dapp/tacit.js:14010 |
| tacit:scanSlotsFromPrivkey | 22 | tacit-specs/dapp/tacit.js:20572 |
| tacit:buildAndBroadcastLpAddVariant0 | 22 | tacit-specs/dapp/tacit.js:23455 |
| tacit:_pollClaimSubmissionsStatus | 22 | tacit-specs/dapp/tacit.js:52950 |
| tacit:_bucketPointsVWAP | 22 | tacit-specs/dapp/tacit.js:69655 |
| amm-envelope:encodeLpAdd | 21 | tacit-specs/dapp/amm-envelope.js:139 |
| tacit:decodeCDropPayload | 21 | tacit-specs/dapp/tacit.js:7362 |
| tacit:encodeTSlotMergePayload | 21 | tacit-specs/dapp/tacit.js:8485 |
| tacit:publishAxferVarIntent | 21 | tacit-specs/dapp/tacit.js:28088 |
| tacit:refreshWallet | 21 | tacit-specs/dapp/tacit.js:43888 |
| tacit:_renderDropSources | 21 | tacit-specs/dapp/tacit.js:47870 |
| tacit:_renderPreauthRecoveryBannerHtml | 21 | tacit-specs/dapp/tacit.js:58005 |
| tacit:enrichDiscoverBurns | 21 | tacit-specs/dapp/tacit.js:59466 |
| tacit:_snapshotMyListings | 21 | tacit-specs/dapp/tacit.js:61114 |
| tacit:_wireMarketPriceChartCursor | 21 | tacit-specs/dapp/tacit.js:70448 |
| tacit:encodePreauthBidVarPayload | 20 | tacit-specs/dapp/tacit.js:6814 |
| tacit:decodeTSlotMergePayload | 20 | tacit-specs/dapp/tacit.js:8572 |
| tacit:decodeTSwapRoutePayload | 20 | tacit-specs/dapp/tacit.js:10791 |
| tacit:takeAxferOffer | 20 | tacit-specs/dapp/tacit.js:27269 |
| tacit:publishPreauthSale | 20 | tacit-specs/dapp/tacit.js:29341 |
| tacit:renderMarketAmmCeremonySection | 20 | tacit-specs/dapp/tacit.js:41989 |
| tacit:_publishDropAnnouncement | 20 | tacit-specs/dapp/tacit.js:47483 |
| tacit:_renderClaimSnapshotInfo | 20 | tacit-specs/dapp/tacit.js:50882 |
| tacit:_reconcileSwapSellPending | 20 | tacit-specs/dapp/tacit.js:57677 |
| tacit:_aggregatePreauthRowsForLadder | 20 | tacit-specs/dapp/tacit.js:67242 |
| tacit:applyDiscoverFilter | 20 | tacit-specs/dapp/tacit.js:84691 |
| tacit:_showPasskeyModal | 19 | tacit-specs/dapp/tacit.js:1573 |
| tacit:ensureSatsFunded | 19 | tacit-specs/dapp/tacit.js:1667 |
| tacit:_spRefreshToggles | 19 | tacit-specs/dapp/tacit.js:4777 |
| tacit:bpRangeAggBatchVerify | 19 | tacit-specs/dapp/tacit.js:5590 |
| tacit:decodeTCbtcTacWithdrawPayload | 19 | tacit-specs/dapp/tacit.js:9526 |
| tacit:decodeTShareSlashClaimPayload | 19 | tacit-specs/dapp/tacit.js:9708 |
| tacit:encodeTCbtcTacTopUpPayload | 19 | tacit-specs/dapp/tacit.js:10374 |
| tacit:buildAndBroadcastSlotMint | 19 | tacit-specs/dapp/tacit.js:18889 |
| tacit:_scanSlotChildren | 19 | tacit-specs/dapp/tacit.js:20654 |
| tacit:buildAndBroadcastCbtcTacForceClose | 19 | tacit-specs/dapp/tacit.js:22264 |
| tacit:publishAxferIntent | 19 | tacit-specs/dapp/tacit.js:27863 |
| tacit:claimAxferIntent | 19 | tacit-specs/dapp/tacit.js:28334 |
| tacit:_pollMakerListings | 19 | tacit-specs/dapp/tacit.js:35985 |
| tacit:_updateNavOpenOrdersBadge | 19 | tacit-specs/dapp/tacit.js:36090 |
| tacit:_activateTab | 19 | tacit-specs/dapp/tacit.js:42689 |
| tacit:findSwapRoutePath | 19 | tacit-specs/dapp/tacit.js:42885 |
| tacit:renderPool | 19 | tacit-specs/dapp/tacit.js:43003 |
| tacit:_wirePoolLpAddForm | 19 | tacit-specs/dapp/tacit.js:43181 |
| tacit:_verifyDropFulfilBatch | 19 | tacit-specs/dapp/tacit.js:49115 |
| tacit:renderMarket | 19 | tacit-specs/dapp/tacit.js:63617 |
| tacit:_runAxferClaimsPollerOnce | 19 | tacit-specs/dapp/tacit.js:73750 |
| tacit:marketValidate | 19 | tacit-specs/dapp/tacit.js:83492 |
| tacit:_runFirstLoadChoice | 19 | tacit-specs/dapp/tacit.js:85822 |
| amm-envelope:decodeLpAdd | 18 | tacit-specs/dapp/amm-envelope.js:236 |
| tacit:_passphraseModal | 18 | tacit-specs/dapp/tacit.js:873 |
| tacit:msm | 18 | tacit-specs/dapp/tacit.js:5279 |
| tacit:decodeCPetchPayload | 18 | tacit-specs/dapp/tacit.js:7186 |
| tacit:_scanSlotAnchorCandidate | 18 | tacit-specs/dapp/tacit.js:20864 |
| tacit:_renderAmmCerDrawerBody | 18 | tacit-specs/dapp/tacit.js:41270 |
| tacit:_fundTreasuryWithTAC | 18 | tacit-specs/dapp/tacit.js:47724 |
| tacit:_renderClaimSubmissions | 18 | tacit-specs/dapp/tacit.js:53058 |
| tacit:_marketFloorByAsset | 18 | tacit-specs/dapp/tacit.js:62398 |
| tacit:_marketMarkPriceByAsset | 18 | tacit-specs/dapp/tacit.js:62464 |
| tacit:_aggregateBidsForLadder | 18 | tacit-specs/dapp/tacit.js:67330 |
| tacit:_matchableAsksForBid | 18 | tacit-specs/dapp/tacit.js:71424 |
| tacit:marketCancelIntentHandler | 18 | tacit-specs/dapp/tacit.js:82331 |
| tacit:_normaliseMarketPrefs | 18 | tacit-specs/dapp/tacit.js:84820 |
| bulletproofs-plus:msm | 17 | tacit-specs/dapp/bulletproofs-plus.js:182 |
| tacit:encodeTSlotRotatePayload | 17 | tacit-specs/dapp/tacit.js:8087 |
| tacit:decodeTCbtcTacWithdrawAtomicPayload | 17 | tacit-specs/dapp/tacit.js:10279 |
| tacit:decodeTCbtcTacTopUpPayload | 17 | tacit-specs/dapp/tacit.js:10420 |
| tacit:decodeTSwapVarPayload | 17 | tacit-specs/dapp/tacit.js:10868 |
| tacit:buildAndBroadcastSwapVarSelfFulfill | 17 | tacit-specs/dapp/tacit.js:24224 |
| tacit:scanAssetForStealthReceipts | 17 | tacit-specs/dapp/tacit.js:26312 |
| tacit:carveExactAmount | 17 | tacit-specs/dapp/tacit.js:26821 |
| tacit:fulfilAxferVarIntent | 17 | tacit-specs/dapp/tacit.js:28731 |
| tacit:_chooseVarBidParams | 17 | tacit-specs/dapp/tacit.js:29695 |
| tacit:renderSavedDropsList | 17 | tacit-specs/dapp/tacit.js:47320 |
| tacit:_fundTreasuryWithSats | 17 | tacit-specs/dapp/tacit.js:47804 |
| tacit:_renderClaimEligibility | 17 | tacit-specs/dapp/tacit.js:51182 |
| tacit:_pendingReconcileAgainstLiveCache | 17 | tacit-specs/dapp/tacit.js:60700 |
| tacit:_renderAmmContribTape | 17 | tacit-specs/dapp/tacit.js:61602 |
| tacit:marketGroupRows | 17 | tacit-specs/dapp/tacit.js:67550 |
| tacit:showMarketListPreviewModal | 17 | tacit-specs/dapp/tacit.js:68418 |
| tacit:marketTakePreauthHandler | 17 | tacit-specs/dapp/tacit.js:82621 |
| tacit:marketCancelPreauthGroupHandler | 17 | tacit-specs/dapp/tacit.js:83305 |
| tacit:marketTakeHandler | 17 | tacit-specs/dapp/tacit.js:83380 |
| tacit:setupExtWalletButtons | 17 | tacit-specs/dapp/tacit.js:84291 |
| amm-farm-ui:refreshFarmsTab | 16 | tacit-specs/dapp/amm-farm-ui.js:115 |
| amm-sigma:verifyXCurve | 16 | tacit-specs/dapp/amm-sigma.js:189 |
| tacit:renderSatsFragmentationBanner | 16 | tacit-specs/dapp/tacit.js:3109 |
| tacit:receiverScanTxForSilentPayments | 16 | tacit-specs/dapp/tacit.js:4671 |
| tacit:decodeTDepositPayload | 16 | tacit-specs/dapp/tacit.js:7673 |
| tacit:decodeTCbtcTacDepositPayload | 16 | tacit-specs/dapp/tacit.js:9403 |
| tacit:encodeTCbtcTacBondReleasePayload | 16 | tacit-specs/dapp/tacit.js:10504 |
| tacit:friendlyTradeErrorMsg | 16 | tacit-specs/dapp/tacit.js:13433 |
| tacit:validateRangeListingFully | 16 | tacit-specs/dapp/tacit.js:33764 |
| tacit:_ammClaimReservationWithQueue | 16 | tacit-specs/dapp/tacit.js:40564 |
| tacit:_pendingReconcileAgainstChain | 16 | tacit-specs/dapp/tacit.js:60748 |
| tacit:_renderPendingSettlementsStrip | 16 | tacit-specs/dapp/tacit.js:60871 |
| tacit:marketActivityRowsHtml | 16 | tacit-specs/dapp/tacit.js:68719 |
| tacit:marketClaimIntentHandler | 16 | tacit-specs/dapp/tacit.js:82077 |
| tacit:_exportKeyModal | 15 | tacit-specs/dapp/tacit.js:1016 |
| tacit:_flushOutspendBatch | 15 | tacit-specs/dapp/tacit.js:3329 |
| tacit:decodeSilentPaymentAddress | 15 | tacit-specs/dapp/tacit.js:4507 |
| tacit:decodeCDClaimPayload | 15 | tacit-specs/dapp/tacit.js:7482 |
| tacit:decodeTSlotRotatePayload | 15 | tacit-specs/dapp/tacit.js:8139 |
| tacit:encodeTCbtcTacWithdrawPayload | 15 | tacit-specs/dapp/tacit.js:9477 |
| tacit:decodeTCbtcTacDepositAtomicPayload | 15 | tacit-specs/dapp/tacit.js:10151 |
| tacit:decodeTCbtcTacBondReleasePayload | 15 | tacit-specs/dapp/tacit.js:10539 |
| tacit:recordActivity | 15 | tacit-specs/dapp/tacit.js:12850 |
| tacit:recoverPreauthCommitsBatch | 15 | tacit-specs/dapp/tacit.js:13674 |
| tacit:buildAndBroadcastCEtch | 15 | tacit-specs/dapp/tacit.js:18080 |
| tacit:buildAndBroadcastPetch | 15 | tacit-specs/dapp/tacit.js:18252 |
| tacit:buildAndBroadcastProtocolFeeClaim | 15 | tacit-specs/dapp/tacit.js:23889 |
| tacit:buildSwapVarEnvelopeSelfFulfill | 15 | tacit-specs/dapp/tacit.js:24092 |
| tacit:fulfilBidIntent | 15 | tacit-specs/dapp/tacit.js:32166 |
| tacit:buildAndBroadcastSatsConsolidate | 15 | tacit-specs/dapp/tacit.js:33228 |
| tacit:_priceAlertsPollOnce | 15 | tacit-specs/dapp/tacit.js:34782 |
| tacit:_renderAmmCerEligibilityBanner | 15 | tacit-specs/dapp/tacit.js:41116 |
| tacit:previewSwapRoute | 15 | tacit-specs/dapp/tacit.js:43377 |
| tacit:_openDropFulfil | 15 | tacit-specs/dapp/tacit.js:48273 |
| tacit:bindMarketActivityTable | 15 | tacit-specs/dapp/tacit.js:68329 |
| tacit:setupMarketButtons | 15 | tacit-specs/dapp/tacit.js:85069 |
| bulletproofs-plus:_bppRangeProveAttempt | 14 | tacit-specs/dapp/bulletproofs-plus.js:513 |
| tacit:_flushTxBatch | 14 | tacit-specs/dapp/tacit.js:3628 |
| tacit:decodeCEtchPayload | 14 | tacit-specs/dapp/tacit.js:6322 |
| tacit:encodeTSlotMintPayload | 14 | tacit-specs/dapp/tacit.js:7932 |
| tacit:encodeTShareSlashClaimPayload | 14 | tacit-specs/dapp/tacit.js:9664 |
| tacit:encodeTSwapVarPayload | 14 | tacit-specs/dapp/tacit.js:10602 |
| tacit:_autoResumePendingChunkedListings | 14 | tacit-specs/dapp/tacit.js:15616 |
| tacit:buildSwapRouteEnvelopeSelfFulfill | 14 | tacit-specs/dapp/tacit.js:24389 |
| tacit:buildAndBroadcastDeposit | 14 | tacit-specs/dapp/tacit.js:24674 |
| tacit:buildMixerMerkleProof | 14 | tacit-specs/dapp/tacit.js:24941 |
| tacit:publishPreauthSaleChunks | 14 | tacit-specs/dapp/tacit.js:30821 |
| tacit:tacitConfirm | 14 | tacit-specs/dapp/tacit.js:35724 |
| tacit:_startLiveAgeTicker | 14 | tacit-specs/dapp/tacit.js:46026 |
| tacit:_claimReconstructDiscoveredRows | 14 | tacit-specs/dapp/tacit.js:53364 |
| tacit:enrichDiscoverAttestation | 14 | tacit-specs/dapp/tacit.js:59363 |
| tacit:enrichDiscoverMints | 14 | tacit-specs/dapp/tacit.js:59425 |
| tacit:_sellSidePriceFootgunGuard | 14 | tacit-specs/dapp/tacit.js:62586 |
| tacit:_autoFulfilPollOnce | 14 | tacit-specs/dapp/tacit.js:63268 |
| tacit:_populateBidAskSpread | 14 | tacit-specs/dapp/tacit.js:72546 |
| tacit:_improveBidHandler | 14 | tacit-specs/dapp/tacit.js:73548 |
| tacit:marketConfirmGroupBuy | 14 | tacit-specs/dapp/tacit.js:82859 |
| tacit:applyDiscoverSort | 14 | tacit-specs/dapp/tacit.js:84616 |
| tacit:encodePreauthBidPayload | 13 | tacit-specs/dapp/tacit.js:6689 |
| tacit:decodePreauthBidVarPayload | 13 | tacit-specs/dapp/tacit.js:6877 |
| tacit:encodeTCtacLienSplitPayload | 13 | tacit-specs/dapp/tacit.js:9799 |
| tacit:decodeTCtacLienSplitPayload | 13 | tacit-specs/dapp/tacit.js:9834 |
| tacit:_detectOfflineFills | 13 | tacit-specs/dapp/tacit.js:15734 |
| tacit:buildAndBroadcastPmint | 13 | tacit-specs/dapp/tacit.js:25988 |
| tacit:buildAxferOffer | 13 | tacit-specs/dapp/tacit.js:26922 |
| tacit:updateSatsRecipientHint | 13 | tacit-specs/dapp/tacit.js:46753 |
| tacit:_consumeClaimUrlHash | 13 | tacit-specs/dapp/tacit.js:52487 |
| tacit:_wireOtcPaidButtons | 13 | tacit-specs/dapp/tacit.js:57942 |
| tacit:_renderSoftCancelRiskStrip | 13 | tacit-specs/dapp/tacit.js:61037 |
| tacit:_decorateBidForReservation | 13 | tacit-specs/dapp/tacit.js:72154 |
| bulletproofs-plus:bppRangeProve | 12 | tacit-specs/dapp/bulletproofs-plus.js:460 |
| tacit:getTx | 12 | tacit-specs/dapp/tacit.js:3700 |
| tacit:bpRangeAggProve | 12 | tacit-specs/dapp/tacit.js:5474 |
| tacit:tapSighash | 12 | tacit-specs/dapp/tacit.js:5938 |
| tacit:tapSighashKeyPath | 12 | tacit-specs/dapp/tacit.js:6008 |
| tacit:encodeCDropPayload | 12 | tacit-specs/dapp/tacit.js:7302 |
| tacit:decodeTSlotMintPayload | 12 | tacit-specs/dapp/tacit.js:7983 |
| tacit:encodeTCbtcTacDepositPayload | 12 | tacit-specs/dapp/tacit.js:9365 |
| tacit:encodeTSwapRoutePayload | 12 | tacit-specs/dapp/tacit.js:10748 |
| tacit:_ipfsCidMatches | 12 | tacit-specs/dapp/tacit.js:11294 |
| tacit:_computeAssetPnl | 12 | tacit-specs/dapp/tacit.js:12822 |
| tacit:_fetchPmintCredited | 12 | tacit-specs/dapp/tacit.js:13844 |
| tacit:scanHoldings | 12 | tacit-specs/dapp/tacit.js:16136 |
| tacit:buildAndBroadcastSwapRoute | 12 | tacit-specs/dapp/tacit.js:24545 |
| tacit:_bidOverCommitCheck | 12 | tacit-specs/dapp/tacit.js:31880 |
| tacit:buildAndBroadcastCMint | 12 | tacit-specs/dapp/tacit.js:32494 |
| tacit:applyOptimisticDebit | 12 | tacit-specs/dapp/tacit.js:34687 |
| tacit:setNumberAnimated | 12 | tacit-specs/dapp/tacit.js:35097 |
| tacit:markTickerCollisions | 12 | tacit-specs/dapp/tacit.js:35213 |
| tacit:_buildCeremonyEligibilityEnvelope | 12 | tacit-specs/dapp/tacit.js:39214 |
| tacit:_ammPinataTusUpload | 12 | tacit-specs/dapp/tacit.js:40457 |
| tacit:_wireAmmCeremonyChipOnce | 12 | tacit-specs/dapp/tacit.js:41952 |
| tacit:_wirePoolLpRemoveForm | 12 | tacit-specs/dapp/tacit.js:43283 |
| tacit:_renderWalletTacitAssetsLine | 12 | tacit-specs/dapp/tacit.js:43846 |
| tacit:_sweepTreasuryToAddress | 12 | tacit-specs/dapp/tacit.js:47658 |
| tacit:_parseClaimTuples | 12 | tacit-specs/dapp/tacit.js:49076 |
| tacit:_claimConnectMetaMask | 12 | tacit-specs/dapp/tacit.js:51086 |
| tacit:_claimSign | 12 | tacit-specs/dapp/tacit.js:51372 |
| tacit:_renderAutoFulfilNudgeBannerHtml | 12 | tacit-specs/dapp/tacit.js:58110 |
| tacit:_wirePreauthRecoveryButtons | 12 | tacit-specs/dapp/tacit.js:58162 |
| tacit:postHint | 12 | tacit-specs/dapp/tacit.js:58237 |
| tacit:_processDiscoverCardVerify | 12 | tacit-specs/dapp/tacit.js:59047 |
| tacit:fetchMarketData | 12 | tacit-specs/dapp/tacit.js:63101 |
| tacit:sortMarketGroups | 12 | tacit-specs/dapp/tacit.js:67594 |
| tacit:mergeMarketActivityEvents | 12 | tacit-specs/dapp/tacit.js:68701 |
| tacit:_attachActivityAddressLazyLoader | 12 | tacit-specs/dapp/tacit.js:68807 |
| tacit:_bucketSecForTimeFrame | 12 | tacit-specs/dapp/tacit.js:69609 |
| tacit:_previewBidTakeRoute | 12 | tacit-specs/dapp/tacit.js:73496 |
| tacit:marketCancelPreauthHandler | 12 | tacit-specs/dapp/tacit.js:83184 |
| tacit:buildCommandPaletteItems | 12 | tacit-specs/dapp/tacit.js:85431 |
| circuits.prove-sample:main | 12 | tacit-specs/dapp/circuits/prove-sample.mjs:30 |
| bulletproofs:verifySchnorr | 11 | tacit-specs/dapp/bulletproofs.js:86 |
| tacit:ensurePrivkey | 11 | tacit-specs/dapp/tacit.js:1457 |
| tacit:renderPasskeyPanel | 11 | tacit-specs/dapp/tacit.js:1524 |
| tacit:getUtxos | 11 | tacit-specs/dapp/tacit.js:2906 |
| tacit:senderComputeSilentPaymentOutput | 11 | tacit-specs/dapp/tacit.js:4576 |
| tacit:decodePreauthBidPayload | 11 | tacit-specs/dapp/tacit.js:6730 |
| tacit:encodeCBurnPayload | 11 | tacit-specs/dapp/tacit.js:7075 |
| tacit:decodeCBurnPayload | 11 | tacit-specs/dapp/tacit.js:7101 |
| tacit:encodeCPetchPayload | 11 | tacit-specs/dapp/tacit.js:7151 |
| tacit:encodeCDClaimPayload | 11 | tacit-specs/dapp/tacit.js:7436 |
| tacit:decodeTSlotBurnPayload | 11 | tacit-specs/dapp/tacit.js:8054 |
| tacit:buildSlotMergeEnvelope | 11 | tacit-specs/dapp/tacit.js:8937 |
| tacit:encodeTCbtcTacDepositAtomicPayload | 11 | tacit-specs/dapp/tacit.js:10103 |
| tacit:swapVarCurveDeltaOut | 11 | tacit-specs/dapp/tacit.js:10930 |
| tacit:verifyAmmProof | 11 | tacit-specs/dapp/tacit.js:11471 |
| tacit:_fetchAmmZkey | 11 | tacit-specs/dapp/tacit.js:11506 |
| tacit:_loadCbtcTacManifestFromIpfs | 11 | tacit-specs/dapp/tacit.js:12254 |
| tacit:_lpSyntheticMeta | 11 | tacit-specs/dapp/tacit.js:12398 |
| tacit:_splitCSVLine | 11 | tacit-specs/dapp/tacit.js:33913 |
| tacit:applyOptimisticCredit | 11 | tacit-specs/dapp/tacit.js:34986 |
| tacit:setTabBadge | 11 | tacit-specs/dapp/tacit.js:35062 |
| tacit:_renderClaimWizDropHeader | 11 | tacit-specs/dapp/tacit.js:53892 |
| tacit:openDiscoverBidForm | 11 | tacit-specs/dapp/tacit.js:60157 |
| tacit:_snapshotMyBids | 11 | tacit-specs/dapp/tacit.js:61192 |
| tacit:groupChunkedPreauthListings | 11 | tacit-specs/dapp/tacit.js:67426 |
| tacit:fetchMarketAssetStats | 11 | tacit-specs/dapp/tacit.js:68597 |
| tacit:renderMarketAssetStatsHTML | 11 | tacit-specs/dapp/tacit.js:69312 |
| tacit:_lazyPaintWhenVisible | 11 | tacit-specs/dapp/tacit.js:72625 |
| tacit:_yourOrdersTakeClaimHandler | 11 | tacit-specs/dapp/tacit.js:73668 |
| tacit:updateMarketControlsVisibility | 11 | tacit-specs/dapp/tacit.js:82046 |
| tacit:_showOtcTakeGate | 11 | tacit-specs/dapp/tacit.js:82458 |
| tacit:renderExtWalletPanel | 11 | tacit-specs/dapp/tacit.js:84216 |
| tacit:_promptImportKey | 11 | tacit-specs/dapp/tacit.js:85779 |
| amm-asset:derivePoolId | 10 | tacit-specs/dapp/amm-asset.js:58 |
| amm-bjj:modSqrt | 10 | tacit-specs/dapp/amm-bjj.js:52 |
| amm-farm-actions:broadcastFarmTx | 10 | tacit-specs/dapp/amm-farm-actions.js:73 |
| amm-farm-ui:el | 10 | tacit-specs/dapp/amm-farm-ui.js:33 |
| tacit:_readCachedExtState | 10 | tacit-specs/dapp/tacit.js:699 |
| tacit:decodeStealthAddress | 10 | tacit-specs/dapp/tacit.js:4220 |
| tacit:decodeAxferPayload | 10 | tacit-specs/dapp/tacit.js:6496 |
| tacit:decodeAxferVarPayload | 10 | tacit-specs/dapp/tacit.js:6531 |
| tacit:decodeAxferBppPayload | 10 | tacit-specs/dapp/tacit.js:6601 |
| tacit:decodeAxferVarBppPayload | 10 | tacit-specs/dapp/tacit.js:6654 |
| tacit:encodeCDClaimWitness | 10 | tacit-specs/dapp/tacit.js:7463 |
| tacit:encodeTSlotBurnPayload | 10 | tacit-specs/dapp/tacit.js:8027 |
| tacit:ammDerivePoolIdDapp | 10 | tacit-specs/dapp/tacit.js:10989 |
| tacit:verifyMixerProof | 10 | tacit-specs/dapp/tacit.js:11378 |
| tacit:fetchBuyerOpening | 10 | tacit-specs/dapp/tacit.js:12760 |
| tacit:_fetchDclaimCredited | 10 | tacit-specs/dapp/tacit.js:13923 |
| tacit:_validateWithdrawRecord | 10 | tacit-specs/dapp/tacit.js:18652 |
| tacit:fulfilAxferIntent | 10 | tacit-specs/dapp/tacit.js:28559 |
| tacit:publishRangeListing | 10 | tacit-specs/dapp/tacit.js:33678 |
| tacit:mergeAirdropRows | 10 | tacit-specs/dapp/tacit.js:34071 |
| tacit:buildAirdropClaimMsg | 10 | tacit-specs/dapp/tacit.js:34209 |
| tacit:decodeShareLinkHash | 10 | tacit-specs/dapp/tacit.js:34433 |
| tacit:setupCustomApiPanel | 10 | tacit-specs/dapp/tacit.js:44011 |
| tacit:_buildDropSnapshot | 10 | tacit-specs/dapp/tacit.js:48027 |
| tacit:_renderTreasuryBanner | 10 | tacit-specs/dapp/tacit.js:48342 |
| tacit:_showDiscordGateModal | 10 | tacit-specs/dapp/tacit.js:52674 |
| tacit:_renderClaimWizSteps | 10 | tacit-specs/dapp/tacit.js:53962 |
| tacit:verifyDiscoverAsset | 10 | tacit-specs/dapp/tacit.js:59235 |
| tacit:_classifySpendingTx | 10 | tacit-specs/dapp/tacit.js:60674 |
| tacit:_marketLiveCountsByAsset | 10 | tacit-specs/dapp/tacit.js:62663 |
| tacit:hydrateMarketImages | 10 | tacit-specs/dapp/tacit.js:66783 |
| tacit:_renderTileSparklineSVG | 10 | tacit-specs/dapp/tacit.js:69447 |
| tacit:refreshYourOpenOrdersPanel | 10 | tacit-specs/dapp/tacit.js:73420 |
| tacit:marketFulfilIntentHandler | 10 | tacit-specs/dapp/tacit.js:82179 |
| tacit:setupHoldingsButtons | 10 | tacit-specs/dapp/tacit.js:84487 |
| tacit:_matchesPill | 10 | tacit-specs/dapp/tacit.js:84593 |
## Most-Called Functions (global)
| Function | Callers |
| --- | --- |
| tacit:escapeHtml | 1428 |
| tacit:BigInt | 1101 |
| tacit:Number | 1030 |
| tacit:bytesToHex | 672 |
| tacit:String | 584 |
| tacit:$ | 541 |
| tacit:toast | 500 |
| tacit:hexToBytes | 453 |
| document.getElementById | 425 |
| Date.now | 421 |
| Number.isFinite | 362 |
| Math.floor | 317 |
| Number.isInteger | 311 |
| payload.slice | 310 |
| Array.isArray | 271 |
## Per-Module Breakdown
### amm-asset
- **Functions**: 6
| Hotspot | Complexity | Line |
| --- | --- | --- |
| amm-asset:derivePoolId | 10 | 58 |
| Most-Called | Callers |
| --- | --- |
| amm-asset:hexToBytes | 5 |
| amm-asset:sha256 | 4 |
| amm-asset:concatBytes | 4 |
| amm-asset:reverseBytes | 2 |
| amm-asset:canonicalAssetPair | 2 |
### amm-bjj
- **Functions**: 22
| Hotspot | Complexity | Line |
| --- | --- | --- |
| amm-bjj:modSqrt | 10 | 52 |
| Most-Called | Callers |
| --- | --- |
| amm-bjj:mod | 24 |
| amm-bjj:mulScalar | 11 |
| amm-bjj:modPow | 8 |
| amm-bjj:addPoint | 7 |
| amm-bjj:pedersenBJJ | 6 |
### amm-envelope
- **Functions**: 36
| Hotspot | Complexity | Line |
| --- | --- | --- |
| amm-envelope:encodeLpAdd | 21 | 139 |
| amm-envelope:decodeLpAdd | 18 | 236 |
| Most-Called | Callers |
| --- | --- |
| amm-envelope:asBytes | 73 |
| amm-envelope:u64LE | 21 |
| amm-envelope:concatBytes | 17 |
| amm-envelope:BigInt | 14 |
| amm-envelope:_readU64LE | 13 |
### amm-farm-actions
- **Functions**: 13
| Hotspot | Complexity | Line |
| --- | --- | --- |
| amm-farm-actions:broadcastFarmTx | 10 | 73 |
| Most-Called | Callers |
| --- | --- |
| amm-farm-actions:hexToBytes | 21 |
| amm-farm-actions:BigInt | 17 |
| amm-farm-actions:bytesToHex | 10 |
| amm-farm-actions:bigintToBytes32 | 7 |
| amm-farm-actions:sha256 | 7 |
### amm-farm-ui
- **Functions**: 7
| Hotspot | Complexity | Line |
| --- | --- | --- |
| amm-farm-ui:refreshFarmsTab | 16 | 115 |
| amm-farm-ui:el | 10 | 33 |
| Most-Called | Callers |
| --- | --- |
| amm-farm-ui:el | 19 |
| amm-farm-ui:fmtBigInt | 9 |
| amm-farm-ui:BigInt | 9 |
| amm-farm-ui:fmtHexShort | 6 |
| amm-farm-ui:refreshFarmsTab | 3 |
### amm-kernel
- **Functions**: 12
| Most-Called | Callers |
| --- | --- |
| amm-kernel:asBytes | 7 |
| amm-kernel:u64LE | 6 |
| amm-kernel:modN | 4 |
| amm-kernel:BigInt | 3 |
| amm-kernel:outpointBytes | 3 |
### amm-min-liq
- **Functions**: 14
| Most-Called | Callers |
| --- | --- |
| amm-min-liq:concatBytes | 7 |
| amm-min-liq:BigInt | 6 |
| amm-min-liq:sha256 | 5 |
| amm-min-liq:asBytes32 | 5 |
| amm-min-liq:bytesEqual | 4 |
### amm-receipt
- **Functions**: 8
| Most-Called | Callers |
| --- | --- |
| amm-receipt:bytesToBigintBE | 5 |
| amm-receipt:concatBytes | 4 |
| amm-receipt:deriveReceiptBlinding | 4 |
| amm-receipt:asBytes32 | 3 |
| amm-receipt:hexToBytes | 3 |
### amm-sigma
- **Functions**: 13
| Hotspot | Complexity | Line |
| --- | --- | --- |
| amm-sigma:verifyXCurve | 16 | 189 |
| Most-Called | Callers |
| --- | --- |
| amm-sigma:bytesToBigintBE | 7 |
| amm-sigma:bigintToBytesBE | 7 |
| amm-sigma:modN_BJJ | 6 |
| amm-sigma:modSecp | 5 |
| amm-sigma:concatBytes | 4 |
### bulletproofs
- **Functions**: 10
| Hotspot | Complexity | Line |
| --- | --- | --- |
| bulletproofs:verifySchnorr | 11 | 86 |
| Most-Called | Callers |
| --- | --- |
| bulletproofs:bytes32ToBigint | 7 |
| bulletproofs:_taggedHash | 5 |
| bulletproofs:modN | 4 |
| bulletproofs:sha256 | 4 |
| bulletproofs:concatBytes | 4 |
### bulletproofs-plus
- **Functions**: 30
| Hotspot | Complexity | Line |
| --- | --- | --- |
| bulletproofs-plus:bppRangeVerify | 27 | 787 |
| bulletproofs-plus:msm | 17 | 182 |
| bulletproofs-plus:_bppRangeProveAttempt | 14 | 513 |
| bulletproofs-plus:bppRangeProve | 12 | 460 |
| Most-Called | Callers |
| --- | --- |
| bulletproofs-plus:modN | 114 |
| bulletproofs-plus:pointToBytes | 18 |
| bulletproofs-plus:safeMult | 12 |
| bulletproofs-plus:BigInt | 10 |
| bulletproofs-plus:randomScalar | 8 |
### circuits.amm.adversarial-test
- **Functions**: 4
| Most-Called | Callers |
| --- | --- |
| circuits.amm.adversarial-test:Array | 13 |
| circuits.amm.adversarial-test:randomBJJBlinding | 3 |
| circuits.amm.adversarial-test:buildWitnessCalculator | 2 |
| circuits.amm.adversarial-test:resolve | 2 |
| circuits.amm.adversarial-test:BigInt | 2 |
### circuits.amm.amm_lp_add
- **Functions**: 1
| Most-Called | Callers |
| --- | --- |
| circuits.amm.amm_lp_add:AmmLpAdd | 2 |
| circuits.amm.amm_lp_add:PedersenBJJ | 1 |
| circuits.amm.amm_lp_add:main | 1 |
### circuits.amm.amm_lp_remove
- **Functions**: 1
| Most-Called | Callers |
| --- | --- |
| circuits.amm.amm_lp_remove:AmmLpRemove | 2 |
| circuits.amm.amm_lp_remove:PedersenBJJ | 2 |
| circuits.amm.amm_lp_remove:Num2Bits | 1 |
| circuits.amm.amm_lp_remove:main | 1 |
### circuits.amm.amm_swap_batch
- **Functions**: 1
| Most-Called | Callers |
| --- | --- |
| circuits.amm.amm_swap_batch:Num2Bits | 13 |
| circuits.amm.amm_swap_batch:AmmSwapBatch | 2 |
| circuits.amm.amm_swap_batch:IsZero | 2 |
| circuits.amm.amm_swap_batch:LessThan | 2 |
| circuits.amm.amm_swap_batch:PedersenBJJ | 2 |
### circuits.amm.bjj_pedersen
- **Functions**: 4
| Most-Called | Callers |
| --- | --- |
| circuits.amm.bjj_pedersen:H_BJJ_BASE_U | 2 |
| circuits.amm.bjj_pedersen:H_BJJ_BASE_V | 2 |
| circuits.amm.bjj_pedersen:G_BJJ_BASE_U | 2 |
| circuits.amm.bjj_pedersen:G_BJJ_BASE_V | 2 |
| circuits.amm.bjj_pedersen:Num2Bits | 2 |
### circuits.amm.dev-zkey.dapp-prover-wiring\.test
- **Functions**: 9
| Most-Called | Callers |
| --- | --- |
| circuits.amm.dev-zkey.dapp-prover-wiring\.test:_be32ToDecimal | 9 |
| circuits.amm.dev-zkey.dapp-prover-wiring\.test:slice | 8 |
| circuits.amm.dev-zkey.dapp-prover-wiring\.test:writeBE32 | 8 |
| circuits.amm.dev-zkey.dapp-prover-wiring\.test:BigInt | 5 |
| circuits.amm.dev-zkey.dapp-prover-wiring\.test:_isSkip | 3 |
### circuits.amm.dev-zkey.demo
- **Functions**: 2
| Most-Called | Callers |
| --- | --- |
| circuits.amm.dev-zkey.demo:randomBJJBlinding | 1 |
| circuits.amm.dev-zkey.demo:BigInt | 1 |
| circuits.amm.dev-zkey.demo:snarkjs | 1 |
| circuits.amm.dev-zkey.demo:execSync | 1 |
### circuits.amm.dev-zkey.demo_lp_remove
- **Functions**: 2
| Most-Called | Callers |
| --- | --- |
| circuits.amm.dev-zkey.demo_lp_remove:randomBJJBlinding | 1 |
| circuits.amm.dev-zkey.demo_lp_remove:BigInt | 1 |
| circuits.amm.dev-zkey.demo_lp_remove:snarkjs | 1 |
| circuits.amm.dev-zkey.demo_lp_remove:execSync | 1 |
### circuits.amm.dev-zkey.demo_swap_batch
- **Functions**: 3
| Most-Called | Callers |
| --- | --- |
| circuits.amm.dev-zkey.demo_swap_batch:randomBJJBlinding | 3 |
| circuits.amm.dev-zkey.demo_swap_batch:BigInt | 2 |
| circuits.amm.dev-zkey.demo_swap_batch:buildSwapInput | 1 |
| circuits.amm.dev-zkey.demo_swap_batch:snarkjs | 1 |
| circuits.amm.dev-zkey.demo_swap_batch:execSync | 1 |
### circuits.amm.dev-zkey.prove-verify-roundtrip\.test
- **Functions**: 6
| Most-Called | Callers |
| --- | --- |
| circuits.amm.dev-zkey.prove-verify-roundtrip\.test:_isSkip | 3 |
| circuits.amm.dev-zkey.prove-verify-roundtrip\.test:fn | 2 |
| circuits.amm.dev-zkey.prove-verify-roundtrip\.test:test | 1 |
| circuits.amm.dev-zkey.prove-verify-roundtrip\.test:testAsync | 1 |
| circuits.amm.dev-zkey.prove-verify-roundtrip\.test:randomBJJBlinding | 1 |
### circuits.amm.drift-guard\.test
- **Functions**: 2
| Most-Called | Callers |
| --- | --- |
| circuits.amm.drift-guard\.test:sha256File | 1 |
| circuits.amm.drift-guard\.test:createHash | 1 |
| circuits.amm.drift-guard\.test:readFileSync | 1 |
| circuits.amm.drift-guard\.test:test | 1 |
| circuits.amm.drift-guard\.test:fn | 1 |
### circuits.amm.witness-test
- **Functions**: 4
| Most-Called | Callers |
| --- | --- |
| circuits.amm.witness-test:randomBJJBlinding | 3 |
| circuits.amm.witness-test:resolve | 2 |
| circuits.amm.witness-test:BigInt | 2 |
| circuits.amm.witness-test:buildWitnessCalculator | 1 |
| circuits.amm.witness-test:require | 1 |
### circuits.prove-sample
- **Functions**: 2
| Hotspot | Complexity | Line |
| --- | --- | --- |
| circuits.prove-sample:main | 12 | 30 |
| Most-Called | Callers |
| --- | --- |
| circuits.prove-sample:poseidon | 6 |
| circuits.prove-sample:randFr | 4 |
| circuits.prove-sample:BigInt | 1 |
| circuits.prove-sample:main | 1 |
| circuits.prove-sample:buildPoseidon | 1 |
### circuits.withdraw
- **Functions**: 1
| Most-Called | Callers |
| --- | --- |
| circuits.withdraw:Poseidon | 3 |
| circuits.withdraw:Withdraw | 2 |
| circuits.withdraw:MerkleTreeChecker | 1 |
| circuits.withdraw:main | 1 |
### prf-wallet
- **Functions**: 10
| Most-Called | Callers |
| --- | --- |
| prf-wallet:prfBytesToScalar | 4 |
| prf-wallet:loadPrfMap | 4 |
| prf-wallet:toB64 | 3 |
| prf-wallet:fromB64 | 2 |
| prf-wallet:bytesToHex | 2 |
### sw
- **Functions**: 4
| Most-Called | Callers |
| --- | --- |
| sw:_revalidate | 2 |
| sw:fetch | 2 |
| sw:_cacheForRequest | 1 |
| sw:_isImmutableWorkerPath | 1 |
| sw:_cacheFirst | 1 |
### tacit
- **Functions**: 1527
| Hotspot | Complexity | Line |
| --- | --- | --- |
| tacit:_wireSwapTile | 1024 | 75998 |
| tacit:renderHoldings | 563 | 54418 |
| tacit:applyMarketFilters | 452 | 63849 |
| tacit:setupMixerHandlers | 419 | 36923 |
| tacit:_scanHoldingsImpl | 311 | 16254 |
| tacit:_validateOutpointSingle | 272 | 14131 |
| tacit:populateMarketBidsLadder | 227 | 74702 |
| tacit:populateMarketAssetStats | 199 | 70593 |
| tacit:setupDropsForm | 188 | 49383 |
| tacit:_submitAmmCeremonyContribution | 114 | 41352 |
| tacit:renderDiscoverCard | 111 | 59638 |
| tacit:renderPetchDiscover | 107 | 83601 |
| tacit:renderMarketPriceChartSVG | 100 | 69777 |
| tacit:renderRecentEtches | 99 | 58292 |
| tacit:_renderMarketAskForm | 94 | 81601 |
| tacit:_populateDepthChart | 93 | 72669 |
| tacit:_wireMarketBidPlace | 93 | 80938 |
| tacit:renderYourOpenOrdersHTML | 91 | 71627 |
| tacit:_wireMarketSweepSell | 90 | 80574 |
| tacit:_renderClaimTreasuryFundPanel | 87 | 51658 |
| tacit:renderMarketAssetHeader | 86 | 68900 |
| tacit:setupEtchForm | 76 | 45129 |
| tacit:renderMarketBrowseTable | 74 | 67897 |
| tacit:_autoFulfilTick | 71 | 48518 |
| tacit:_startMarketAutoRefresh | 70 | 61700 |
| tacit:setupTopupModal | 69 | 44083 |
| tacit:buildAndBroadcastCXferMulti | 68 | 26373 |
| tacit:takePreauthBidVar | 66 | 30376 |
| tacit:scanPools | 66 | 36281 |
| tacit:setupTransferForm | 65 | 46307 |
| tacit:setupWalletButtons | 63 | 44433 |
| tacit:_renderClaimDiscoverListNow | 61 | 53455 |
| tacit:_effectiveReferenceUnit | 59 | 62249 |
| tacit:init | 59 | 85913 |
| tacit:ceremonyContributeAmm | 57 | 40633 |
| tacit:_wireMarketSweepBuy | 57 | 80274 |
| tacit:verifySlotLeafOnChain | 54 | 11719 |
| tacit:setupClaimTab | 54 | 54028 |
| tacit:buildAndBroadcastSatsSend | 53 | 32915 |
| tacit:renderActivity | 53 | 57742 |
| tacit:ceremonyRender | 51 | 40047 |
| tacit:_bidTakeInsteadHandler | 51 | 73965 |
| tacit:_triggerStealthAutoScanInBackground | 49 | 15932 |
| tacit:renderMixer | 49 | 36638 |
| tacit:setupSatsSendForm | 49 | 46802 |
| tacit:takePreauthSaleBatch | 48 | 31396 |
| tacit:_scanBestBook | 48 | 72295 |
| tacit:takePreauthBid | 47 | 30047 |
| tacit:ceremonyContribute | 47 | 42078 |
| tacit:_renderGlobalTape | 47 | 61381 |
| tacit:renderWalletCard | 46 | 43674 |
| tacit:_claimRefreshDiscover | 46 | 53143 |
| tacit:_claimValidateSnapshot | 45 | 50679 |
| tacit:renderMarketBrowse | 45 | 67669 |
| tacit:getParentEnvelopeData | 43 | 15322 |
| tacit:buildAndBroadcastSlotMerge | 42 | 20111 |
| tacit:setupPetchForm | 42 | 45605 |
| tacit:primeSwapTileFromOrderbook | 42 | 74264 |
| tacit:renderHoldingsOpenOrdersHTML | 42 | 74495 |
| tacit:buildAndBroadcastSlotSplit | 41 | 19815 |
| tacit:buildAndBroadcastSlotBurn | 39 | 19105 |
| tacit:verifyAxferOffer | 39 | 27129 |
| tacit:publishPreauthBidVar | 38 | 29734 |
| tacit:takePreauthSale | 37 | 30961 |
| tacit:_startClaimReactivePoller | 37 | 52210 |
| tacit:_importDropJSON | 36 | 49225 |
| tacit:_consumeTabUrlHash | 36 | 52588 |
| tacit:buildAndBroadcastSlotRotate | 35 | 19545 |
| tacit:_wirePoolSwapForm | 35 | 43417 |
| tacit:_populateTradesTape | 35 | 73144 |
| tacit:_getUtxosViaTxHistory | 33 | 2660 |
| tacit:openDiscoverBidPanel | 33 | 60227 |
| tacit:discoverStealthFromTxid | 32 | 26142 |
| tacit:buildAndBroadcastCbtcTacWithdraw | 31 | 21701 |
| tacit:buildAndBroadcastCbtcTacWithdrawAtomic | 31 | 22931 |
| tacit:_ceremonyFetchIpfsWithFailover | 31 | 39573 |
| tacit:_bulkPrefetchAssetMetadata | 31 | 44909 |
| tacit:_processBatchedDiscoverCardVerify | 31 | 59112 |
| tacit:marketTakeIntentHandler | 30 | 82222 |
| tacit:_showWelcomeModal | 30 | 85644 |
| tacit:buildAndBroadcastCbtcTacDepositAtomic | 29 | 22652 |
| tacit:finalizeAxferVarTake | 29 | 28980 |
| tacit:setupCeremonyHandlers | 29 | 42536 |
| tacit:marketPartialFillPrompt | 29 | 82727 |
| tacit:setupNetworkSelect | 29 | 85190 |
| tacit:buildAndBroadcastTDrop | 28 | 25389 |
| tacit:fulfilBidIntentBatch | 28 | 32311 |
| tacit:startMarketLivenessPrune | 28 | 63447 |
| tacit:setupDiscoverButtons | 28 | 84909 |
| tacit:publishPreauthBid | 27 | 29487 |
| tacit:resolveImageUri | 27 | 45006 |
| tacit:_crossCheckOneEntry | 27 | 48867 |
| tacit:enrichDiscoverPriceFloor | 27 | 59522 |
| tacit:_renderAtomicOffersTilesHtml | 27 | 71497 |
| tacit:bindMarketAssetHeader | 27 | 81387 |
| tacit:marketTakePreauthGroupHandler | 27 | 82995 |
| tacit:getFeeRate | 26 | 3781 |
| tacit:decodeTSlotSplitPayload | 26 | 8342 |
| tacit:fetchListedUtxoTags | 26 | 13105 |
| tacit:buildAndBroadcastWithdraw | 26 | 25054 |
| tacit:_renderCeremonyOutcomeBanners | 26 | 39754 |
| tacit:_updateMarketCellsInPlace | 26 | 62068 |
| tacit:_renderSwapProgress | 26 | 75849 |
| tacit:api | 25 | 2215 |
| tacit:decodeEnvelopeScript | 25 | 6237 |
| tacit:_reconcileOtcSettlements | 25 | 17836 |
| tacit:buildAndBroadcastCbtcTacDeposit | 25 | 21392 |
| tacit:buildAndBroadcastShareSlashClaim | 25 | 22030 |
| tacit:buildAndBroadcastLpAddPoolInit | 25 | 23182 |
| tacit:publishBidIntent | 25 | 31922 |
| tacit:_renderCeremonyCelebration | 25 | 39911 |
| tacit:setupBridgeModal | 25 | 44348 |
| tacit:_handleDropRowAction | 25 | 47401 |
| tacit:_wireDepthChartInteractivity | 25 | 73312 |
| tacit:renderDiscover | 25 | 84060 |
| tacit:getBtcUsdPrice | 24 | 2429 |
| tacit:scanInboundSlotNotes | 24 | 20436 |
| tacit:verifyDisclosure | 24 | 33446 |
| tacit:renderOffers | 24 | 57528 |
| tacit:_renderInflightPill | 24 | 60531 |
| tacit:_computeInBandBookStats | 24 | 72460 |
| tacit:setupCommandPalette | 24 | 85525 |
| tacit:encodeTSlotSplitPayload | 23 | 8252 |
| tacit:verifyMixerDepositKernelOnChain | 23 | 11656 |
| tacit:buildAndBroadcastCtacLienSplit | 23 | 22436 |
| tacit:buildAndBroadcastLpRemove | 23 | 23658 |
| tacit:buildAndBroadcastTDClaim | 23 | 25594 |
| tacit:buildAndBroadcastTDropReclaim | 23 | 25792 |
| tacit:claimAxferVarIntent | 23 | 28451 |
| tacit:buildAndBroadcastCBurn | 23 | 32614 |
| tacit:parseAirdropCSV | 23 | 33993 |
| tacit:importShareLink | 23 | 34461 |
| tacit:openPriceAlertModal | 23 | 34850 |
| tacit:_populatePoolForms | 23 | 43083 |
| tacit:_runDropCrossCheck | 23 | 48999 |
| tacit:_renderClaimResult | 23 | 51499 |
| tacit:_cancelAllOrdersHandler | 23 | 73895 |
| tacit:_localUtxoListedConflict | 22 | 13059 |
| tacit:validateOutpoint | 22 | 14010 |
| tacit:scanSlotsFromPrivkey | 22 | 20572 |
| tacit:buildAndBroadcastLpAddVariant0 | 22 | 23455 |
| tacit:_pollClaimSubmissionsStatus | 22 | 52950 |
| tacit:_bucketPointsVWAP | 22 | 69655 |
| tacit:decodeCDropPayload | 21 | 7362 |
| tacit:encodeTSlotMergePayload | 21 | 8485 |
| tacit:publishAxferVarIntent | 21 | 28088 |
| tacit:refreshWallet | 21 | 43888 |
| tacit:_renderDropSources | 21 | 47870 |
| tacit:_renderPreauthRecoveryBannerHtml | 21 | 58005 |
| tacit:enrichDiscoverBurns | 21 | 59466 |
| tacit:_snapshotMyListings | 21 | 61114 |
| tacit:_wireMarketPriceChartCursor | 21 | 70448 |
| tacit:encodePreauthBidVarPayload | 20 | 6814 |
| tacit:decodeTSlotMergePayload | 20 | 8572 |
| tacit:decodeTSwapRoutePayload | 20 | 10791 |
| tacit:takeAxferOffer | 20 | 27269 |
| tacit:publishPreauthSale | 20 | 29341 |
| tacit:renderMarketAmmCeremonySection | 20 | 41989 |
| tacit:_publishDropAnnouncement | 20 | 47483 |
| tacit:_renderClaimSnapshotInfo | 20 | 50882 |
| tacit:_reconcileSwapSellPending | 20 | 57677 |
| tacit:_aggregatePreauthRowsForLadder | 20 | 67242 |
| tacit:applyDiscoverFilter | 20 | 84691 |
| tacit:_showPasskeyModal | 19 | 1573 |
| tacit:ensureSatsFunded | 19 | 1667 |
| tacit:_spRefreshToggles | 19 | 4777 |
| tacit:bpRangeAggBatchVerify | 19 | 5590 |
| tacit:decodeTCbtcTacWithdrawPayload | 19 | 9526 |
| tacit:decodeTShareSlashClaimPayload | 19 | 9708 |
| tacit:encodeTCbtcTacTopUpPayload | 19 | 10374 |
| tacit:buildAndBroadcastSlotMint | 19 | 18889 |
| tacit:_scanSlotChildren | 19 | 20654 |
| tacit:buildAndBroadcastCbtcTacForceClose | 19 | 22264 |
| tacit:publishAxferIntent | 19 | 27863 |
| tacit:claimAxferIntent | 19 | 28334 |
| tacit:_pollMakerListings | 19 | 35985 |
| tacit:_updateNavOpenOrdersBadge | 19 | 36090 |
| tacit:_activateTab | 19 | 42689 |
| tacit:findSwapRoutePath | 19 | 42885 |
| tacit:renderPool | 19 | 43003 |
| tacit:_wirePoolLpAddForm | 19 | 43181 |
| tacit:_verifyDropFulfilBatch | 19 | 49115 |
| tacit:renderMarket | 19 | 63617 |
| tacit:_runAxferClaimsPollerOnce | 19 | 73750 |
| tacit:marketValidate | 19 | 83492 |
| tacit:_runFirstLoadChoice | 19 | 85822 |
| tacit:_passphraseModal | 18 | 873 |
| tacit:msm | 18 | 5279 |
| tacit:decodeCPetchPayload | 18 | 7186 |
| tacit:_scanSlotAnchorCandidate | 18 | 20864 |
| tacit:_renderAmmCerDrawerBody | 18 | 41270 |
| tacit:_fundTreasuryWithTAC | 18 | 47724 |
| tacit:_renderClaimSubmissions | 18 | 53058 |
| tacit:_marketFloorByAsset | 18 | 62398 |
| tacit:_marketMarkPriceByAsset | 18 | 62464 |
| tacit:_aggregateBidsForLadder | 18 | 67330 |
| tacit:_matchableAsksForBid | 18 | 71424 |
| tacit:marketCancelIntentHandler | 18 | 82331 |
| tacit:_normaliseMarketPrefs | 18 | 84820 |
| tacit:encodeTSlotRotatePayload | 17 | 8087 |
| tacit:decodeTCbtcTacWithdrawAtomicPayload | 17 | 10279 |
| tacit:decodeTCbtcTacTopUpPayload | 17 | 10420 |
| tacit:decodeTSwapVarPayload | 17 | 10868 |
| tacit:buildAndBroadcastSwapVarSelfFulfill | 17 | 24224 |
| tacit:scanAssetForStealthReceipts | 17 | 26312 |
| tacit:carveExactAmount | 17 | 26821 |
| tacit:fulfilAxferVarIntent | 17 | 28731 |
| tacit:_chooseVarBidParams | 17 | 29695 |
| tacit:renderSavedDropsList | 17 | 47320 |
| tacit:_fundTreasuryWithSats | 17 | 47804 |
| tacit:_renderClaimEligibility | 17 | 51182 |
| tacit:_pendingReconcileAgainstLiveCache | 17 | 60700 |
| tacit:_renderAmmContribTape | 17 | 61602 |
| tacit:marketGroupRows | 17 | 67550 |
| tacit:showMarketListPreviewModal | 17 | 68418 |
| tacit:marketTakePreauthHandler | 17 | 82621 |
| tacit:marketCancelPreauthGroupHandler | 17 | 83305 |
| tacit:marketTakeHandler | 17 | 83380 |
| tacit:setupExtWalletButtons | 17 | 84291 |
| tacit:renderSatsFragmentationBanner | 16 | 3109 |
| tacit:receiverScanTxForSilentPayments | 16 | 4671 |
| tacit:decodeTDepositPayload | 16 | 7673 |
| tacit:decodeTCbtcTacDepositPayload | 16 | 9403 |
| tacit:encodeTCbtcTacBondReleasePayload | 16 | 10504 |
| tacit:friendlyTradeErrorMsg | 16 | 13433 |
| tacit:validateRangeListingFully | 16 | 33764 |
| tacit:_ammClaimReservationWithQueue | 16 | 40564 |
| tacit:_pendingReconcileAgainstChain | 16 | 60748 |
| tacit:_renderPendingSettlementsStrip | 16 | 60871 |
| tacit:marketActivityRowsHtml | 16 | 68719 |
| tacit:marketClaimIntentHandler | 16 | 82077 |
| tacit:_exportKeyModal | 15 | 1016 |
| tacit:_flushOutspendBatch | 15 | 3329 |
| tacit:decodeSilentPaymentAddress | 15 | 4507 |
| tacit:decodeCDClaimPayload | 15 | 7482 |
| tacit:decodeTSlotRotatePayload | 15 | 8139 |
| tacit:encodeTCbtcTacWithdrawPayload | 15 | 9477 |
| tacit:decodeTCbtcTacDepositAtomicPayload | 15 | 10151 |
| tacit:decodeTCbtcTacBondReleasePayload | 15 | 10539 |
| tacit:recordActivity | 15 | 12850 |
| tacit:recoverPreauthCommitsBatch | 15 | 13674 |
| tacit:buildAndBroadcastCEtch | 15 | 18080 |
| tacit:buildAndBroadcastPetch | 15 | 18252 |
| tacit:buildAndBroadcastProtocolFeeClaim | 15 | 23889 |
| tacit:buildSwapVarEnvelopeSelfFulfill | 15 | 24092 |
| tacit:fulfilBidIntent | 15 | 32166 |
| tacit:buildAndBroadcastSatsConsolidate | 15 | 33228 |
| tacit:_priceAlertsPollOnce | 15 | 34782 |
| tacit:_renderAmmCerEligibilityBanner | 15 | 41116 |
| tacit:previewSwapRoute | 15 | 43377 |
| tacit:_openDropFulfil | 15 | 48273 |
| tacit:bindMarketActivityTable | 15 | 68329 |
| tacit:setupMarketButtons | 15 | 85069 |
| tacit:_flushTxBatch | 14 | 3628 |
| tacit:decodeCEtchPayload | 14 | 6322 |
| tacit:encodeTSlotMintPayload | 14 | 7932 |
| tacit:encodeTShareSlashClaimPayload | 14 | 9664 |
| tacit:encodeTSwapVarPayload | 14 | 10602 |
| tacit:_autoResumePendingChunkedListings | 14 | 15616 |
| tacit:buildSwapRouteEnvelopeSelfFulfill | 14 | 24389 |
| tacit:buildAndBroadcastDeposit | 14 | 24674 |
| tacit:buildMixerMerkleProof | 14 | 24941 |
| tacit:publishPreauthSaleChunks | 14 | 30821 |
| tacit:tacitConfirm | 14 | 35724 |
| tacit:_startLiveAgeTicker | 14 | 46026 |
| tacit:_claimReconstructDiscoveredRows | 14 | 53364 |
| tacit:enrichDiscoverAttestation | 14 | 59363 |
| tacit:enrichDiscoverMints | 14 | 59425 |
| tacit:_sellSidePriceFootgunGuard | 14 | 62586 |
| tacit:_autoFulfilPollOnce | 14 | 63268 |
| tacit:_populateBidAskSpread | 14 | 72546 |
| tacit:_improveBidHandler | 14 | 73548 |
| tacit:marketConfirmGroupBuy | 14 | 82859 |
| tacit:applyDiscoverSort | 14 | 84616 |
| tacit:encodePreauthBidPayload | 13 | 6689 |
| tacit:decodePreauthBidVarPayload | 13 | 6877 |
| tacit:encodeTCtacLienSplitPayload | 13 | 9799 |
| tacit:decodeTCtacLienSplitPayload | 13 | 9834 |
| tacit:_detectOfflineFills | 13 | 15734 |
| tacit:buildAndBroadcastPmint | 13 | 25988 |
| tacit:buildAxferOffer | 13 | 26922 |
| tacit:updateSatsRecipientHint | 13 | 46753 |
| tacit:_consumeClaimUrlHash | 13 | 52487 |
| tacit:_wireOtcPaidButtons | 13 | 57942 |
| tacit:_renderSoftCancelRiskStrip | 13 | 61037 |
| tacit:_decorateBidForReservation | 13 | 72154 |
| tacit:getTx | 12 | 3700 |
| tacit:bpRangeAggProve | 12 | 5474 |
| tacit:tapSighash | 12 | 5938 |
| tacit:tapSighashKeyPath | 12 | 6008 |
| tacit:encodeCDropPayload | 12 | 7302 |
| tacit:decodeTSlotMintPayload | 12 | 7983 |
| tacit:encodeTCbtcTacDepositPayload | 12 | 9365 |
| tacit:encodeTSwapRoutePayload | 12 | 10748 |
| tacit:_ipfsCidMatches | 12 | 11294 |
| tacit:_computeAssetPnl | 12 | 12822 |
| tacit:_fetchPmintCredited | 12 | 13844 |
| tacit:scanHoldings | 12 | 16136 |
| tacit:buildAndBroadcastSwapRoute | 12 | 24545 |
| tacit:_bidOverCommitCheck | 12 | 31880 |
| tacit:buildAndBroadcastCMint | 12 | 32494 |
| tacit:applyOptimisticDebit | 12 | 34687 |
| tacit:setNumberAnimated | 12 | 35097 |
| tacit:markTickerCollisions | 12 | 35213 |
| tacit:_buildCeremonyEligibilityEnvelope | 12 | 39214 |
| tacit:_ammPinataTusUpload | 12 | 40457 |
| tacit:_wireAmmCeremonyChipOnce | 12 | 41952 |
| tacit:_wirePoolLpRemoveForm | 12 | 43283 |
| tacit:_renderWalletTacitAssetsLine | 12 | 43846 |
| tacit:_sweepTreasuryToAddress | 12 | 47658 |
| tacit:_parseClaimTuples | 12 | 49076 |
| tacit:_claimConnectMetaMask | 12 | 51086 |
| tacit:_claimSign | 12 | 51372 |
| tacit:_renderAutoFulfilNudgeBannerHtml | 12 | 58110 |
| tacit:_wirePreauthRecoveryButtons | 12 | 58162 |
| tacit:postHint | 12 | 58237 |
| tacit:_processDiscoverCardVerify | 12 | 59047 |
| tacit:fetchMarketData | 12 | 63101 |
| tacit:sortMarketGroups | 12 | 67594 |
| tacit:mergeMarketActivityEvents | 12 | 68701 |
| tacit:_attachActivityAddressLazyLoader | 12 | 68807 |
| tacit:_bucketSecForTimeFrame | 12 | 69609 |
| tacit:_previewBidTakeRoute | 12 | 73496 |
| tacit:marketCancelPreauthHandler | 12 | 83184 |
| tacit:buildCommandPaletteItems | 12 | 85431 |
| tacit:ensurePrivkey | 11 | 1457 |
| tacit:renderPasskeyPanel | 11 | 1524 |
| tacit:getUtxos | 11 | 2906 |
| tacit:senderComputeSilentPaymentOutput | 11 | 4576 |
| tacit:decodePreauthBidPayload | 11 | 6730 |
| tacit:encodeCBurnPayload | 11 | 7075 |
| tacit:decodeCBurnPayload | 11 | 7101 |
| tacit:encodeCPetchPayload | 11 | 7151 |
| tacit:encodeCDClaimPayload | 11 | 7436 |
| tacit:decodeTSlotBurnPayload | 11 | 8054 |
| tacit:buildSlotMergeEnvelope | 11 | 8937 |
| tacit:encodeTCbtcTacDepositAtomicPayload | 11 | 10103 |
| tacit:swapVarCurveDeltaOut | 11 | 10930 |
| tacit:verifyAmmProof | 11 | 11471 |
| tacit:_fetchAmmZkey | 11 | 11506 |
| tacit:_loadCbtcTacManifestFromIpfs | 11 | 12254 |
| tacit:_lpSyntheticMeta | 11 | 12398 |
| tacit:_splitCSVLine | 11 | 33913 |
| tacit:applyOptimisticCredit | 11 | 34986 |
| tacit:setTabBadge | 11 | 35062 |
| tacit:_renderClaimWizDropHeader | 11 | 53892 |
| tacit:openDiscoverBidForm | 11 | 60157 |
| tacit:_snapshotMyBids | 11 | 61192 |
| tacit:groupChunkedPreauthListings | 11 | 67426 |
| tacit:fetchMarketAssetStats | 11 | 68597 |
| tacit:renderMarketAssetStatsHTML | 11 | 69312 |
| tacit:_lazyPaintWhenVisible | 11 | 72625 |
| tacit:_yourOrdersTakeClaimHandler | 11 | 73668 |
| tacit:updateMarketControlsVisibility | 11 | 82046 |
| tacit:_showOtcTakeGate | 11 | 82458 |
| tacit:renderExtWalletPanel | 11 | 84216 |
| tacit:_promptImportKey | 11 | 85779 |
| tacit:_readCachedExtState | 10 | 699 |
| tacit:decodeStealthAddress | 10 | 4220 |
| tacit:decodeAxferPayload | 10 | 6496 |
| tacit:decodeAxferVarPayload | 10 | 6531 |
| tacit:decodeAxferBppPayload | 10 | 6601 |
| tacit:decodeAxferVarBppPayload | 10 | 6654 |
| tacit:encodeCDClaimWitness | 10 | 7463 |
| tacit:encodeTSlotBurnPayload | 10 | 8027 |
| tacit:ammDerivePoolIdDapp | 10 | 10989 |
| tacit:verifyMixerProof | 10 | 11378 |
| tacit:fetchBuyerOpening | 10 | 12760 |
| tacit:_fetchDclaimCredited | 10 | 13923 |
| tacit:_validateWithdrawRecord | 10 | 18652 |
| tacit:fulfilAxferIntent | 10 | 28559 |
| tacit:publishRangeListing | 10 | 33678 |
| tacit:mergeAirdropRows | 10 | 34071 |
| tacit:buildAirdropClaimMsg | 10 | 34209 |
| tacit:decodeShareLinkHash | 10 | 34433 |
| tacit:setupCustomApiPanel | 10 | 44011 |
| tacit:_buildDropSnapshot | 10 | 48027 |
| tacit:_renderTreasuryBanner | 10 | 48342 |
| tacit:_showDiscordGateModal | 10 | 52674 |
| tacit:_renderClaimWizSteps | 10 | 53962 |
| tacit:verifyDiscoverAsset | 10 | 59235 |
| tacit:_classifySpendingTx | 10 | 60674 |
| tacit:_marketLiveCountsByAsset | 10 | 62663 |
| tacit:hydrateMarketImages | 10 | 66783 |
| tacit:_renderTileSparklineSVG | 10 | 69447 |
| tacit:refreshYourOpenOrdersPanel | 10 | 73420 |
| tacit:marketFulfilIntentHandler | 10 | 82179 |
| tacit:setupHoldingsButtons | 10 | 84487 |
| tacit:_matchesPill | 10 | 84593 |
| Most-Called | Callers |
| --- | --- |
| tacit:escapeHtml | 1428 |
| tacit:BigInt | 1101 |
| tacit:Number | 1030 |
| tacit:bytesToHex | 672 |
| tacit:String | 584 |

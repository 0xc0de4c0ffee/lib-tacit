# trailmark: tacit-specs/dapp/

Generated: trailmark v0.3.1  |  path: `tacit-specs/dapp`

## Overview

| Metric | Value |
| --- | --- |
| Total nodes | 1779 |
| Functions + methods | 1741 |
| Call edges | 33361 |
| Files parsed | 30 |

## Node Kind Breakdown

| Kind | Count |
| --- | --- |
| function | 1734 |
| module | 30 |
| method | 7 |
| template | 7 |
| class | 1 |

## Source Files

- `tacit-specs/dapp/amm-asset.js`
- `tacit-specs/dapp/amm-bjj.js`
- `tacit-specs/dapp/amm-envelope.js`
- `tacit-specs/dapp/amm-farm-actions.js`
- `tacit-specs/dapp/amm-farm-ui.js`
- `tacit-specs/dapp/amm-kernel.js`
- `tacit-specs/dapp/amm-min-liq.js`
- `tacit-specs/dapp/amm-receipt.js`
- `tacit-specs/dapp/amm-sigma.js`
- `tacit-specs/dapp/bulletproofs-plus.js`
- `tacit-specs/dapp/bulletproofs.js`
- `tacit-specs/dapp/circuits/amm/adversarial-test.mjs`
- `tacit-specs/dapp/circuits/amm/amm_lp_add.circom`
- `tacit-specs/dapp/circuits/amm/amm_lp_remove.circom`
- `tacit-specs/dapp/circuits/amm/amm_swap_batch.circom`
- `tacit-specs/dapp/circuits/amm/bjj_pedersen.circom`
- `tacit-specs/dapp/circuits/amm/dev-zkey/dapp-prover-wiring.test.mjs`
- `tacit-specs/dapp/circuits/amm/dev-zkey/demo.mjs`
- `tacit-specs/dapp/circuits/amm/dev-zkey/demo_lp_remove.mjs`
- `tacit-specs/dapp/circuits/amm/dev-zkey/demo_swap_batch.mjs`
- `tacit-specs/dapp/circuits/amm/dev-zkey/prove-verify-roundtrip.test.mjs`
- `tacit-specs/dapp/circuits/amm/drift-guard.test.mjs`
- `tacit-specs/dapp/circuits/amm/witness-test.mjs`
- `tacit-specs/dapp/circuits/merkleTree.circom`
- `tacit-specs/dapp/circuits/prove-sample.mjs`
- `tacit-specs/dapp/circuits/withdraw.circom`
- `tacit-specs/dapp/preboot.js`
- `tacit-specs/dapp/prf-wallet.js`
- `tacit-specs/dapp/sw.js`
- `tacit-specs/dapp/tacit.js`

## Complexity Hotspots (cyclomatic >= 10)

| Function | Complexity | File |
| --- | --- | --- |
| tacit:_wireSwapTile | 1024 | tacit-specs/dapp/tacit.js:75528 |
| tacit:renderHoldings | 563 | tacit-specs/dapp/tacit.js:53937 |
| tacit:applyMarketFilters | 452 | tacit-specs/dapp/tacit.js:63368 |
| tacit:setupMixerHandlers | 419 | tacit-specs/dapp/tacit.js:36625 |
| tacit:_scanHoldingsImpl | 311 | tacit-specs/dapp/tacit.js:16022 |
| tacit:_validateOutpointSingle | 272 | tacit-specs/dapp/tacit.js:13927 |
| tacit:populateMarketBidsLadder | 227 | tacit-specs/dapp/tacit.js:74232 |
| tacit:populateMarketAssetStats | 199 | tacit-specs/dapp/tacit.js:70112 |
| tacit:setupDropsForm | 188 | tacit-specs/dapp/tacit.js:48997 |
| tacit:_submitAmmCeremonyContribution | 114 | tacit-specs/dapp/tacit.js:41054 |
| tacit:renderDiscoverCard | 111 | tacit-specs/dapp/tacit.js:59157 |
| tacit:renderPetchDiscover | 107 | tacit-specs/dapp/tacit.js:83130 |
| tacit:renderMarketPriceChartSVG | 100 | tacit-specs/dapp/tacit.js:69296 |
| tacit:renderRecentEtches | 99 | tacit-specs/dapp/tacit.js:57811 |
| tacit:_renderMarketAskForm | 94 | tacit-specs/dapp/tacit.js:81130 |
| tacit:_populateDepthChart | 93 | tacit-specs/dapp/tacit.js:72188 |
| tacit:_wireMarketBidPlace | 93 | tacit-specs/dapp/tacit.js:80467 |
| tacit:renderYourOpenOrdersHTML | 91 | tacit-specs/dapp/tacit.js:71146 |
| tacit:_wireMarketSweepSell | 90 | tacit-specs/dapp/tacit.js:80103 |
| tacit:_renderClaimTreasuryFundPanel | 87 | tacit-specs/dapp/tacit.js:51177 |
| tacit:renderMarketAssetHeader | 85 | tacit-specs/dapp/tacit.js:68419 |
| tacit:setupEtchForm | 76 | tacit-specs/dapp/tacit.js:44743 |
| tacit:renderMarketBrowseTable | 74 | tacit-specs/dapp/tacit.js:67416 |
| tacit:_autoFulfilTick | 71 | tacit-specs/dapp/tacit.js:48132 |
| tacit:_startMarketAutoRefresh | 70 | tacit-specs/dapp/tacit.js:61219 |
| tacit:setupTopupModal | 69 | tacit-specs/dapp/tacit.js:43783 |
| tacit:buildAndBroadcastCXferMulti | 68 | tacit-specs/dapp/tacit.js:26141 |
| tacit:takePreauthBidVar | 66 | tacit-specs/dapp/tacit.js:30144 |
| tacit:scanPools | 66 | tacit-specs/dapp/tacit.js:35983 |
| tacit:setupTransferForm | 65 | tacit-specs/dapp/tacit.js:45921 |
| tacit:setupWalletButtons | 63 | tacit-specs/dapp/tacit.js:44048 |
| tacit:_renderClaimDiscoverListNow | 61 | tacit-specs/dapp/tacit.js:52974 |
| tacit:_effectiveReferenceUnit | 59 | tacit-specs/dapp/tacit.js:61768 |
| tacit:init | 59 | tacit-specs/dapp/tacit.js:85442 |
| tacit:ceremonyContributeAmm | 57 | tacit-specs/dapp/tacit.js:40335 |
| tacit:_wireMarketSweepBuy | 56 | tacit-specs/dapp/tacit.js:79804 |
| tacit:verifySlotLeafOnChain | 54 | tacit-specs/dapp/tacit.js:11515 |
| tacit:setupClaimTab | 54 | tacit-specs/dapp/tacit.js:53547 |
| tacit:buildAndBroadcastSatsSend | 53 | tacit-specs/dapp/tacit.js:32625 |
| tacit:renderActivity | 53 | tacit-specs/dapp/tacit.js:57261 |
| tacit:ceremonyRender | 51 | tacit-specs/dapp/tacit.js:39749 |
| tacit:_triggerStealthAutoScanInBackground | 49 | tacit-specs/dapp/tacit.js:15692 |
| tacit:renderMixer | 49 | tacit-specs/dapp/tacit.js:36340 |
| tacit:setupSatsSendForm | 49 | tacit-specs/dapp/tacit.js:46416 |
| tacit:_bidTakeInsteadHandler | 49 | tacit-specs/dapp/tacit.js:73496 |
| tacit:takePreauthSaleBatch | 48 | tacit-specs/dapp/tacit.js:31164 |
| tacit:_scanBestBook | 48 | tacit-specs/dapp/tacit.js:71814 |
| tacit:takePreauthBid | 47 | tacit-specs/dapp/tacit.js:29815 |
| tacit:ceremonyContribute | 47 | tacit-specs/dapp/tacit.js:41780 |
| tacit:_renderGlobalTape | 47 | tacit-specs/dapp/tacit.js:60900 |
| tacit:_claimRefreshDiscover | 46 | tacit-specs/dapp/tacit.js:52662 |
| tacit:_claimValidateSnapshot | 45 | tacit-specs/dapp/tacit.js:50247 |
| tacit:renderMarketBrowse | 45 | tacit-specs/dapp/tacit.js:67188 |
| tacit:renderWalletCard | 44 | tacit-specs/dapp/tacit.js:43376 |
| tacit:getParentEnvelopeData | 43 | tacit-specs/dapp/tacit.js:15118 |
| tacit:buildAndBroadcastSlotMerge | 42 | tacit-specs/dapp/tacit.js:19879 |
| tacit:setupPetchForm | 42 | tacit-specs/dapp/tacit.js:45219 |
| tacit:primeSwapTileFromOrderbook | 42 | tacit-specs/dapp/tacit.js:73794 |
| tacit:renderHoldingsOpenOrdersHTML | 42 | tacit-specs/dapp/tacit.js:74025 |
| tacit:buildAndBroadcastSlotSplit | 41 | tacit-specs/dapp/tacit.js:19583 |
| tacit:buildAndBroadcastSlotBurn | 39 | tacit-specs/dapp/tacit.js:18873 |
| tacit:verifyAxferOffer | 39 | tacit-specs/dapp/tacit.js:26897 |
| tacit:publishPreauthBidVar | 38 | tacit-specs/dapp/tacit.js:29502 |
| tacit:takePreauthSale | 37 | tacit-specs/dapp/tacit.js:30729 |
| tacit:_startClaimReactivePoller | 37 | tacit-specs/dapp/tacit.js:51729 |
| tacit:_importDropJSON | 36 | tacit-specs/dapp/tacit.js:48839 |
| tacit:_consumeTabUrlHash | 36 | tacit-specs/dapp/tacit.js:52107 |
| tacit:buildAndBroadcastSlotRotate | 35 | tacit-specs/dapp/tacit.js:19313 |
| tacit:_wirePoolSwapForm | 35 | tacit-specs/dapp/tacit.js:43119 |
| tacit:_populateTradesTape | 35 | tacit-specs/dapp/tacit.js:72663 |
| tacit:_getUtxosViaTxHistory | 33 | tacit-specs/dapp/tacit.js:2660 |
| tacit:openDiscoverBidPanel | 33 | tacit-specs/dapp/tacit.js:59746 |
| tacit:discoverStealthFromTxid | 32 | tacit-specs/dapp/tacit.js:25910 |
| tacit:buildAndBroadcastCbtcTacWithdraw | 31 | tacit-specs/dapp/tacit.js:21469 |
| tacit:buildAndBroadcastCbtcTacWithdrawAtomic | 31 | tacit-specs/dapp/tacit.js:22699 |
| tacit:_ceremonyFetchIpfsWithFailover | 31 | tacit-specs/dapp/tacit.js:39275 |
| tacit:_bulkPrefetchAssetMetadata | 31 | tacit-specs/dapp/tacit.js:44523 |
| tacit:_processBatchedDiscoverCardVerify | 31 | tacit-specs/dapp/tacit.js:58631 |
| tacit:marketTakeIntentHandler | 30 | tacit-specs/dapp/tacit.js:81751 |
| tacit:_showWelcomeModal | 30 | tacit-specs/dapp/tacit.js:85173 |
| tacit:buildAndBroadcastCbtcTacDepositAtomic | 29 | tacit-specs/dapp/tacit.js:22420 |
| tacit:finalizeAxferVarTake | 29 | tacit-specs/dapp/tacit.js:28748 |
| tacit:setupCeremonyHandlers | 29 | tacit-specs/dapp/tacit.js:42238 |
| tacit:marketPartialFillPrompt | 29 | tacit-specs/dapp/tacit.js:82256 |
| tacit:setupNetworkSelect | 29 | tacit-specs/dapp/tacit.js:84719 |
| tacit:buildAndBroadcastTDrop | 28 | tacit-specs/dapp/tacit.js:25157 |
| tacit:fulfilBidIntentBatch | 28 | tacit-specs/dapp/tacit.js:32021 |
| tacit:startMarketLivenessPrune | 28 | tacit-specs/dapp/tacit.js:62966 |
| tacit:setupDiscoverButtons | 28 | tacit-specs/dapp/tacit.js:84438 |
| bulletproofs-plus:bppRangeVerify | 27 | tacit-specs/dapp/bulletproofs-plus.js:787 |
| tacit:publishPreauthBid | 27 | tacit-specs/dapp/tacit.js:29255 |
| tacit:resolveImageUri | 27 | tacit-specs/dapp/tacit.js:44620 |
| tacit:_crossCheckOneEntry | 27 | tacit-specs/dapp/tacit.js:48481 |
| tacit:enrichDiscoverPriceFloor | 27 | tacit-specs/dapp/tacit.js:59041 |
| tacit:_renderAtomicOffersTilesHtml | 27 | tacit-specs/dapp/tacit.js:71016 |
| tacit:bindMarketAssetHeader | 27 | tacit-specs/dapp/tacit.js:80916 |
| tacit:marketTakePreauthGroupHandler | 27 | tacit-specs/dapp/tacit.js:82524 |
| tacit:getFeeRate | 26 | tacit-specs/dapp/tacit.js:3781 |
| tacit:decodeTSlotSplitPayload | 26 | tacit-specs/dapp/tacit.js:8342 |
| tacit:fetchListedUtxoTags | 26 | tacit-specs/dapp/tacit.js:12901 |
| tacit:buildAndBroadcastWithdraw | 26 | tacit-specs/dapp/tacit.js:24822 |
| tacit:_renderCeremonyOutcomeBanners | 26 | tacit-specs/dapp/tacit.js:39456 |
| tacit:_updateMarketCellsInPlace | 26 | tacit-specs/dapp/tacit.js:61587 |
| tacit:_renderSwapProgress | 26 | tacit-specs/dapp/tacit.js:75379 |
| tacit:api | 25 | tacit-specs/dapp/tacit.js:2215 |
| tacit:decodeEnvelopeScript | 25 | tacit-specs/dapp/tacit.js:6237 |
| tacit:_reconcileOtcSettlements | 25 | tacit-specs/dapp/tacit.js:17604 |
| tacit:buildAndBroadcastCbtcTacDeposit | 25 | tacit-specs/dapp/tacit.js:21160 |
| tacit:buildAndBroadcastShareSlashClaim | 25 | tacit-specs/dapp/tacit.js:21798 |
| tacit:buildAndBroadcastLpAddPoolInit | 25 | tacit-specs/dapp/tacit.js:22950 |
| tacit:publishBidIntent | 25 | tacit-specs/dapp/tacit.js:31690 |
| tacit:_renderCeremonyCelebration | 25 | tacit-specs/dapp/tacit.js:39613 |
| tacit:_handleDropRowAction | 25 | tacit-specs/dapp/tacit.js:47015 |
| tacit:_wireDepthChartInteractivity | 25 | tacit-specs/dapp/tacit.js:72831 |
| tacit:renderDiscover | 25 | tacit-specs/dapp/tacit.js:83589 |
| tacit:getBtcUsdPrice | 24 | tacit-specs/dapp/tacit.js:2429 |
| tacit:scanInboundSlotNotes | 24 | tacit-specs/dapp/tacit.js:20204 |
| tacit:verifyDisclosure | 24 | tacit-specs/dapp/tacit.js:33156 |
| tacit:renderOffers | 24 | tacit-specs/dapp/tacit.js:57047 |
| tacit:_renderInflightPill | 24 | tacit-specs/dapp/tacit.js:60050 |
| tacit:_computeInBandBookStats | 24 | tacit-specs/dapp/tacit.js:71979 |
| tacit:setupCommandPalette | 24 | tacit-specs/dapp/tacit.js:85054 |
| tacit:encodeTSlotSplitPayload | 23 | tacit-specs/dapp/tacit.js:8252 |
| tacit:verifyMixerDepositKernelOnChain | 23 | tacit-specs/dapp/tacit.js:11452 |
| tacit:buildAndBroadcastCtacLienSplit | 23 | tacit-specs/dapp/tacit.js:22204 |
| tacit:buildAndBroadcastLpRemove | 23 | tacit-specs/dapp/tacit.js:23426 |
| tacit:buildAndBroadcastTDClaim | 23 | tacit-specs/dapp/tacit.js:25362 |
| tacit:buildAndBroadcastTDropReclaim | 23 | tacit-specs/dapp/tacit.js:25560 |
| tacit:claimAxferVarIntent | 23 | tacit-specs/dapp/tacit.js:28219 |
| tacit:buildAndBroadcastCBurn | 23 | tacit-specs/dapp/tacit.js:32324 |
| tacit:parseAirdropCSV | 23 | tacit-specs/dapp/tacit.js:33703 |
| tacit:importShareLink | 23 | tacit-specs/dapp/tacit.js:34171 |
| tacit:openPriceAlertModal | 23 | tacit-specs/dapp/tacit.js:34560 |
| tacit:_populatePoolForms | 23 | tacit-specs/dapp/tacit.js:42785 |
| tacit:_runDropCrossCheck | 23 | tacit-specs/dapp/tacit.js:48613 |
| tacit:_renderClaimResult | 23 | tacit-specs/dapp/tacit.js:51018 |
| tacit:_cancelAllOrdersHandler | 23 | tacit-specs/dapp/tacit.js:73426 |
| tacit:_localUtxoListedConflict | 22 | tacit-specs/dapp/tacit.js:12855 |
| tacit:validateOutpoint | 22 | tacit-specs/dapp/tacit.js:13806 |
| tacit:scanSlotsFromPrivkey | 22 | tacit-specs/dapp/tacit.js:20340 |
| tacit:buildAndBroadcastLpAddVariant0 | 22 | tacit-specs/dapp/tacit.js:23223 |
| tacit:_pollClaimSubmissionsStatus | 22 | tacit-specs/dapp/tacit.js:52469 |
| tacit:_bucketPointsVWAP | 22 | tacit-specs/dapp/tacit.js:69174 |
| amm-envelope:encodeLpAdd | 21 | tacit-specs/dapp/amm-envelope.js:139 |
| tacit:decodeCDropPayload | 21 | tacit-specs/dapp/tacit.js:7362 |
| tacit:encodeTSlotMergePayload | 21 | tacit-specs/dapp/tacit.js:8485 |
| tacit:publishAxferVarIntent | 21 | tacit-specs/dapp/tacit.js:27856 |
| tacit:refreshWallet | 21 | tacit-specs/dapp/tacit.js:43588 |
| tacit:_renderDropSources | 21 | tacit-specs/dapp/tacit.js:47484 |
| tacit:_renderPreauthRecoveryBannerHtml | 21 | tacit-specs/dapp/tacit.js:57524 |
| tacit:enrichDiscoverBurns | 21 | tacit-specs/dapp/tacit.js:58985 |
| tacit:_snapshotMyListings | 21 | tacit-specs/dapp/tacit.js:60633 |
| tacit:_wireMarketPriceChartCursor | 21 | tacit-specs/dapp/tacit.js:69967 |
| tacit:encodePreauthBidVarPayload | 20 | tacit-specs/dapp/tacit.js:6814 |
| tacit:decodeTSlotMergePayload | 20 | tacit-specs/dapp/tacit.js:8572 |
| tacit:decodeTSwapRoutePayload | 20 | tacit-specs/dapp/tacit.js:10587 |
| tacit:takeAxferOffer | 20 | tacit-specs/dapp/tacit.js:27037 |
| tacit:publishPreauthSale | 20 | tacit-specs/dapp/tacit.js:29109 |
| tacit:renderMarketAmmCeremonySection | 20 | tacit-specs/dapp/tacit.js:41691 |
| tacit:_publishDropAnnouncement | 20 | tacit-specs/dapp/tacit.js:47097 |
| tacit:_renderClaimSnapshotInfo | 20 | tacit-specs/dapp/tacit.js:50450 |
| tacit:_reconcileSwapSellPending | 20 | tacit-specs/dapp/tacit.js:57196 |
| tacit:_aggregatePreauthRowsForLadder | 20 | tacit-specs/dapp/tacit.js:66761 |
| tacit:applyDiscoverFilter | 20 | tacit-specs/dapp/tacit.js:84220 |
| tacit:_showPasskeyModal | 19 | tacit-specs/dapp/tacit.js:1573 |
| tacit:ensureSatsFunded | 19 | tacit-specs/dapp/tacit.js:1667 |
| tacit:_spRefreshToggles | 19 | tacit-specs/dapp/tacit.js:4777 |
| tacit:bpRangeAggBatchVerify | 19 | tacit-specs/dapp/tacit.js:5590 |
| tacit:decodeTCbtcTacWithdrawPayload | 19 | tacit-specs/dapp/tacit.js:9322 |
| tacit:decodeTShareSlashClaimPayload | 19 | tacit-specs/dapp/tacit.js:9504 |
| tacit:encodeTCbtcTacTopUpPayload | 19 | tacit-specs/dapp/tacit.js:10170 |
| tacit:buildAndBroadcastSlotMint | 19 | tacit-specs/dapp/tacit.js:18657 |
| tacit:_scanSlotChildren | 19 | tacit-specs/dapp/tacit.js:20422 |
| tacit:buildAndBroadcastCbtcTacForceClose | 19 | tacit-specs/dapp/tacit.js:22032 |
| tacit:publishAxferIntent | 19 | tacit-specs/dapp/tacit.js:27631 |
| tacit:claimAxferIntent | 19 | tacit-specs/dapp/tacit.js:28102 |
| tacit:_pollMakerListings | 19 | tacit-specs/dapp/tacit.js:35687 |
| tacit:_updateNavOpenOrdersBadge | 19 | tacit-specs/dapp/tacit.js:35792 |
| tacit:_activateTab | 19 | tacit-specs/dapp/tacit.js:42391 |
| tacit:findSwapRoutePath | 19 | tacit-specs/dapp/tacit.js:42587 |
| tacit:renderPool | 19 | tacit-specs/dapp/tacit.js:42705 |
| tacit:_wirePoolLpAddForm | 19 | tacit-specs/dapp/tacit.js:42883 |
| tacit:_verifyDropFulfilBatch | 19 | tacit-specs/dapp/tacit.js:48729 |
| tacit:renderMarket | 19 | tacit-specs/dapp/tacit.js:63136 |
| tacit:_runAxferClaimsPollerOnce | 19 | tacit-specs/dapp/tacit.js:73281 |
| tacit:marketValidate | 19 | tacit-specs/dapp/tacit.js:83021 |
| tacit:_runFirstLoadChoice | 19 | tacit-specs/dapp/tacit.js:85351 |
| amm-envelope:decodeLpAdd | 18 | tacit-specs/dapp/amm-envelope.js:236 |
| tacit:_passphraseModal | 18 | tacit-specs/dapp/tacit.js:873 |
| tacit:msm | 18 | tacit-specs/dapp/tacit.js:5279 |
| tacit:decodeCPetchPayload | 18 | tacit-specs/dapp/tacit.js:7186 |
| tacit:_scanSlotAnchorCandidate | 18 | tacit-specs/dapp/tacit.js:20632 |
| tacit:_renderAmmCerDrawerBody | 18 | tacit-specs/dapp/tacit.js:40972 |
| tacit:_fundTreasuryWithTAC | 18 | tacit-specs/dapp/tacit.js:47338 |
| tacit:_renderClaimSubmissions | 18 | tacit-specs/dapp/tacit.js:52577 |
| tacit:_marketFloorByAsset | 18 | tacit-specs/dapp/tacit.js:61917 |
| tacit:_marketMarkPriceByAsset | 18 | tacit-specs/dapp/tacit.js:61983 |
| tacit:_aggregateBidsForLadder | 18 | tacit-specs/dapp/tacit.js:66849 |
| tacit:_matchableAsksForBid | 18 | tacit-specs/dapp/tacit.js:70943 |
| tacit:marketCancelIntentHandler | 18 | tacit-specs/dapp/tacit.js:81860 |
| tacit:_normaliseMarketPrefs | 18 | tacit-specs/dapp/tacit.js:84349 |
| bulletproofs-plus:msm | 17 | tacit-specs/dapp/bulletproofs-plus.js:182 |
| tacit:encodeTSlotRotatePayload | 17 | tacit-specs/dapp/tacit.js:8087 |
| tacit:decodeTCbtcTacWithdrawAtomicPayload | 17 | tacit-specs/dapp/tacit.js:10075 |
| tacit:decodeTCbtcTacTopUpPayload | 17 | tacit-specs/dapp/tacit.js:10216 |
| tacit:decodeTSwapVarPayload | 17 | tacit-specs/dapp/tacit.js:10664 |
| tacit:buildAndBroadcastSwapVarSelfFulfill | 17 | tacit-specs/dapp/tacit.js:23992 |
| tacit:scanAssetForStealthReceipts | 17 | tacit-specs/dapp/tacit.js:26080 |
| tacit:carveExactAmount | 17 | tacit-specs/dapp/tacit.js:26589 |
| tacit:fulfilAxferVarIntent | 17 | tacit-specs/dapp/tacit.js:28499 |
| tacit:_chooseVarBidParams | 17 | tacit-specs/dapp/tacit.js:29463 |
| tacit:renderSavedDropsList | 17 | tacit-specs/dapp/tacit.js:46934 |
| tacit:_fundTreasuryWithSats | 17 | tacit-specs/dapp/tacit.js:47418 |
| tacit:_pendingReconcileAgainstLiveCache | 17 | tacit-specs/dapp/tacit.js:60219 |
| tacit:_renderAmmContribTape | 17 | tacit-specs/dapp/tacit.js:61121 |
| tacit:marketGroupRows | 17 | tacit-specs/dapp/tacit.js:67069 |
| tacit:showMarketListPreviewModal | 17 | tacit-specs/dapp/tacit.js:67937 |
| tacit:marketTakePreauthHandler | 17 | tacit-specs/dapp/tacit.js:82150 |
| tacit:marketCancelPreauthGroupHandler | 17 | tacit-specs/dapp/tacit.js:82834 |
| tacit:marketTakeHandler | 17 | tacit-specs/dapp/tacit.js:82909 |
| tacit:setupExtWalletButtons | 17 | tacit-specs/dapp/tacit.js:83820 |
| amm-farm-ui:refreshFarmsTab | 16 | tacit-specs/dapp/amm-farm-ui.js:115 |
| amm-sigma:verifyXCurve | 16 | tacit-specs/dapp/amm-sigma.js:189 |
| tacit:renderSatsFragmentationBanner | 16 | tacit-specs/dapp/tacit.js:3109 |
| tacit:receiverScanTxForSilentPayments | 16 | tacit-specs/dapp/tacit.js:4671 |
| tacit:decodeTDepositPayload | 16 | tacit-specs/dapp/tacit.js:7673 |
| tacit:decodeTCbtcTacDepositPayload | 16 | tacit-specs/dapp/tacit.js:9199 |
| tacit:encodeTCbtcTacBondReleasePayload | 16 | tacit-specs/dapp/tacit.js:10300 |
| tacit:friendlyTradeErrorMsg | 16 | tacit-specs/dapp/tacit.js:13229 |
| tacit:validateRangeListingFully | 16 | tacit-specs/dapp/tacit.js:33474 |
| tacit:_ammClaimReservationWithQueue | 16 | tacit-specs/dapp/tacit.js:40266 |
| tacit:_pendingReconcileAgainstChain | 16 | tacit-specs/dapp/tacit.js:60267 |
| tacit:_renderPendingSettlementsStrip | 16 | tacit-specs/dapp/tacit.js:60390 |
| tacit:marketActivityRowsHtml | 16 | tacit-specs/dapp/tacit.js:68238 |
| tacit:marketClaimIntentHandler | 16 | tacit-specs/dapp/tacit.js:81606 |
| tacit:_exportKeyModal | 15 | tacit-specs/dapp/tacit.js:1016 |
| tacit:_flushOutspendBatch | 15 | tacit-specs/dapp/tacit.js:3329 |
| tacit:decodeSilentPaymentAddress | 15 | tacit-specs/dapp/tacit.js:4507 |
| tacit:decodeCDClaimPayload | 15 | tacit-specs/dapp/tacit.js:7482 |
| tacit:decodeTSlotRotatePayload | 15 | tacit-specs/dapp/tacit.js:8139 |
| tacit:encodeTCbtcTacWithdrawPayload | 15 | tacit-specs/dapp/tacit.js:9273 |
| tacit:decodeTCbtcTacDepositAtomicPayload | 15 | tacit-specs/dapp/tacit.js:9947 |
| tacit:decodeTCbtcTacBondReleasePayload | 15 | tacit-specs/dapp/tacit.js:10335 |
| tacit:recordActivity | 15 | tacit-specs/dapp/tacit.js:12646 |
| tacit:recoverPreauthCommitsBatch | 15 | tacit-specs/dapp/tacit.js:13470 |
| tacit:buildAndBroadcastCEtch | 15 | tacit-specs/dapp/tacit.js:17848 |
| tacit:buildAndBroadcastPetch | 15 | tacit-specs/dapp/tacit.js:18020 |
| tacit:buildAndBroadcastProtocolFeeClaim | 15 | tacit-specs/dapp/tacit.js:23657 |
| tacit:buildSwapVarEnvelopeSelfFulfill | 15 | tacit-specs/dapp/tacit.js:23860 |
| tacit:fulfilBidIntent | 15 | tacit-specs/dapp/tacit.js:31876 |
| tacit:buildAndBroadcastSatsConsolidate | 15 | tacit-specs/dapp/tacit.js:32938 |
| tacit:_priceAlertsPollOnce | 15 | tacit-specs/dapp/tacit.js:34492 |
| tacit:_renderAmmCerEligibilityBanner | 15 | tacit-specs/dapp/tacit.js:40818 |
| tacit:previewSwapRoute | 15 | tacit-specs/dapp/tacit.js:43079 |
| tacit:_openDropFulfil | 15 | tacit-specs/dapp/tacit.js:47887 |
| tacit:bindMarketActivityTable | 15 | tacit-specs/dapp/tacit.js:67848 |
| tacit:_improveBidHandler | 15 | tacit-specs/dapp/tacit.js:73067 |
| tacit:setupMarketButtons | 15 | tacit-specs/dapp/tacit.js:84598 |
| bulletproofs-plus:_bppRangeProveAttempt | 14 | tacit-specs/dapp/bulletproofs-plus.js:513 |
| tacit:_flushTxBatch | 14 | tacit-specs/dapp/tacit.js:3628 |
| tacit:decodeCEtchPayload | 14 | tacit-specs/dapp/tacit.js:6322 |
| tacit:encodeTSlotMintPayload | 14 | tacit-specs/dapp/tacit.js:7932 |
| tacit:encodeTShareSlashClaimPayload | 14 | tacit-specs/dapp/tacit.js:9460 |
| tacit:encodeTSwapVarPayload | 14 | tacit-specs/dapp/tacit.js:10398 |
| tacit:_autoResumePendingChunkedListings | 14 | tacit-specs/dapp/tacit.js:15412 |
| tacit:buildSwapRouteEnvelopeSelfFulfill | 14 | tacit-specs/dapp/tacit.js:24157 |
| tacit:buildAndBroadcastDeposit | 14 | tacit-specs/dapp/tacit.js:24442 |
| tacit:buildMixerMerkleProof | 14 | tacit-specs/dapp/tacit.js:24709 |
| tacit:publishPreauthSaleChunks | 14 | tacit-specs/dapp/tacit.js:30589 |
| tacit:tacitConfirm | 14 | tacit-specs/dapp/tacit.js:35426 |
| tacit:_startLiveAgeTicker | 14 | tacit-specs/dapp/tacit.js:45640 |
| tacit:_claimReconstructDiscoveredRows | 14 | tacit-specs/dapp/tacit.js:52883 |
| tacit:enrichDiscoverAttestation | 14 | tacit-specs/dapp/tacit.js:58882 |
| tacit:enrichDiscoverMints | 14 | tacit-specs/dapp/tacit.js:58944 |
| tacit:_sellSidePriceFootgunGuard | 14 | tacit-specs/dapp/tacit.js:62105 |
| tacit:_autoFulfilPollOnce | 14 | tacit-specs/dapp/tacit.js:62787 |
| tacit:_populateBidAskSpread | 14 | tacit-specs/dapp/tacit.js:72065 |
| tacit:marketConfirmGroupBuy | 14 | tacit-specs/dapp/tacit.js:82388 |
| tacit:applyDiscoverSort | 14 | tacit-specs/dapp/tacit.js:84145 |
| tacit:encodePreauthBidPayload | 13 | tacit-specs/dapp/tacit.js:6689 |
| tacit:decodePreauthBidVarPayload | 13 | tacit-specs/dapp/tacit.js:6877 |
| tacit:encodeTCtacLienSplitPayload | 13 | tacit-specs/dapp/tacit.js:9595 |
| tacit:decodeTCtacLienSplitPayload | 13 | tacit-specs/dapp/tacit.js:9630 |
| tacit:buildAndBroadcastPmint | 13 | tacit-specs/dapp/tacit.js:25756 |
| tacit:buildAxferOffer | 13 | tacit-specs/dapp/tacit.js:26690 |
| tacit:updateSatsRecipientHint | 13 | tacit-specs/dapp/tacit.js:46367 |
| tacit:_consumeClaimUrlHash | 13 | tacit-specs/dapp/tacit.js:52006 |
| tacit:_wireOtcPaidButtons | 13 | tacit-specs/dapp/tacit.js:57461 |
| tacit:_renderSoftCancelRiskStrip | 13 | tacit-specs/dapp/tacit.js:60556 |
| tacit:_decorateBidForReservation | 13 | tacit-specs/dapp/tacit.js:71673 |
| bulletproofs-plus:bppRangeProve | 12 | tacit-specs/dapp/bulletproofs-plus.js:460 |
| tacit:getTx | 12 | tacit-specs/dapp/tacit.js:3700 |
| tacit:bpRangeAggProve | 12 | tacit-specs/dapp/tacit.js:5474 |
| tacit:tapSighash | 12 | tacit-specs/dapp/tacit.js:5938 |
| tacit:tapSighashKeyPath | 12 | tacit-specs/dapp/tacit.js:6008 |
| tacit:encodeCDropPayload | 12 | tacit-specs/dapp/tacit.js:7302 |
| tacit:decodeTSlotMintPayload | 12 | tacit-specs/dapp/tacit.js:7983 |
| tacit:encodeTCbtcTacDepositPayload | 12 | tacit-specs/dapp/tacit.js:9161 |
| tacit:encodeTSwapRoutePayload | 12 | tacit-specs/dapp/tacit.js:10544 |
| tacit:_ipfsCidMatches | 12 | tacit-specs/dapp/tacit.js:11090 |
| tacit:_computeAssetPnl | 12 | tacit-specs/dapp/tacit.js:12618 |
| tacit:_fetchPmintCredited | 12 | tacit-specs/dapp/tacit.js:13640 |
| tacit:buildAndBroadcastSwapRoute | 12 | tacit-specs/dapp/tacit.js:24313 |
| tacit:_bidOverCommitCheck | 12 | tacit-specs/dapp/tacit.js:31648 |
| tacit:buildAndBroadcastCMint | 12 | tacit-specs/dapp/tacit.js:32204 |
| tacit:applyOptimisticDebit | 12 | tacit-specs/dapp/tacit.js:34397 |
| tacit:setNumberAnimated | 12 | tacit-specs/dapp/tacit.js:34807 |
| tacit:markTickerCollisions | 12 | tacit-specs/dapp/tacit.js:34923 |
| tacit:_buildCeremonyEligibilityEnvelope | 12 | tacit-specs/dapp/tacit.js:38916 |
| tacit:_ammPinataTusUpload | 12 | tacit-specs/dapp/tacit.js:40159 |
| tacit:_wireAmmCeremonyChipOnce | 12 | tacit-specs/dapp/tacit.js:41654 |
| tacit:_wirePoolLpRemoveForm | 12 | tacit-specs/dapp/tacit.js:42985 |
| tacit:_renderWalletTacitAssetsLine | 12 | tacit-specs/dapp/tacit.js:43546 |
| tacit:_sweepTreasuryToAddress | 12 | tacit-specs/dapp/tacit.js:47272 |
| tacit:_parseClaimTuples | 12 | tacit-specs/dapp/tacit.js:48690 |
| tacit:_claimConnectMetaMask | 12 | tacit-specs/dapp/tacit.js:50654 |
| tacit:_renderClaimEligibility | 12 | tacit-specs/dapp/tacit.js:50750 |
| tacit:_claimSign | 12 | tacit-specs/dapp/tacit.js:50891 |
| tacit:_renderAutoFulfilNudgeBannerHtml | 12 | tacit-specs/dapp/tacit.js:57629 |
| tacit:_wirePreauthRecoveryButtons | 12 | tacit-specs/dapp/tacit.js:57681 |
| tacit:postHint | 12 | tacit-specs/dapp/tacit.js:57756 |
| tacit:_processDiscoverCardVerify | 12 | tacit-specs/dapp/tacit.js:58566 |
| tacit:fetchMarketData | 12 | tacit-specs/dapp/tacit.js:62620 |
| tacit:sortMarketGroups | 12 | tacit-specs/dapp/tacit.js:67113 |
| tacit:mergeMarketActivityEvents | 12 | tacit-specs/dapp/tacit.js:68220 |
| tacit:_attachActivityAddressLazyLoader | 12 | tacit-specs/dapp/tacit.js:68326 |
| tacit:_bucketSecForTimeFrame | 12 | tacit-specs/dapp/tacit.js:69128 |
| tacit:_previewBidTakeRoute | 12 | tacit-specs/dapp/tacit.js:73015 |
| tacit:marketCancelPreauthHandler | 12 | tacit-specs/dapp/tacit.js:82713 |
| tacit:buildCommandPaletteItems | 12 | tacit-specs/dapp/tacit.js:84960 |
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
| tacit:encodeTCbtcTacDepositAtomicPayload | 11 | tacit-specs/dapp/tacit.js:9899 |
| tacit:swapVarCurveDeltaOut | 11 | tacit-specs/dapp/tacit.js:10726 |
| tacit:verifyAmmProof | 11 | tacit-specs/dapp/tacit.js:11267 |
| tacit:_fetchAmmZkey | 11 | tacit-specs/dapp/tacit.js:11302 |
| tacit:_loadCbtcTacManifestFromIpfs | 11 | tacit-specs/dapp/tacit.js:12050 |
| tacit:_lpSyntheticMeta | 11 | tacit-specs/dapp/tacit.js:12194 |
| tacit:scanHoldings | 11 | tacit-specs/dapp/tacit.js:15896 |
| tacit:_splitCSVLine | 11 | tacit-specs/dapp/tacit.js:33623 |
| tacit:applyOptimisticCredit | 11 | tacit-specs/dapp/tacit.js:34696 |
| tacit:setTabBadge | 11 | tacit-specs/dapp/tacit.js:34772 |
| tacit:_renderClaimWizDropHeader | 11 | tacit-specs/dapp/tacit.js:53411 |
| tacit:_snapshotMyBids | 11 | tacit-specs/dapp/tacit.js:60711 |
| tacit:groupChunkedPreauthListings | 11 | tacit-specs/dapp/tacit.js:66945 |
| tacit:fetchMarketAssetStats | 11 | tacit-specs/dapp/tacit.js:68116 |
| tacit:renderMarketAssetStatsHTML | 11 | tacit-specs/dapp/tacit.js:68831 |
| tacit:_lazyPaintWhenVisible | 11 | tacit-specs/dapp/tacit.js:72144 |
| tacit:_yourOrdersTakeClaimHandler | 11 | tacit-specs/dapp/tacit.js:73199 |
| tacit:updateMarketControlsVisibility | 11 | tacit-specs/dapp/tacit.js:81575 |
| tacit:_showOtcTakeGate | 11 | tacit-specs/dapp/tacit.js:81987 |
| tacit:renderExtWalletPanel | 11 | tacit-specs/dapp/tacit.js:83745 |
| tacit:_promptImportKey | 11 | tacit-specs/dapp/tacit.js:85308 |
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
| tacit:ammDerivePoolIdDapp | 10 | tacit-specs/dapp/tacit.js:10785 |
| tacit:verifyMixerProof | 10 | tacit-specs/dapp/tacit.js:11174 |
| tacit:fetchBuyerOpening | 10 | tacit-specs/dapp/tacit.js:12556 |
| tacit:_fetchDclaimCredited | 10 | tacit-specs/dapp/tacit.js:13719 |
| tacit:_validateWithdrawRecord | 10 | tacit-specs/dapp/tacit.js:18420 |
| tacit:fulfilAxferIntent | 10 | tacit-specs/dapp/tacit.js:28327 |
| tacit:publishRangeListing | 10 | tacit-specs/dapp/tacit.js:33388 |
| tacit:mergeAirdropRows | 10 | tacit-specs/dapp/tacit.js:33781 |
| tacit:buildAirdropClaimMsg | 10 | tacit-specs/dapp/tacit.js:33919 |
| tacit:decodeShareLinkHash | 10 | tacit-specs/dapp/tacit.js:34143 |
| tacit:setupCustomApiPanel | 10 | tacit-specs/dapp/tacit.js:43711 |
| tacit:_buildDropSnapshot | 10 | tacit-specs/dapp/tacit.js:47641 |
| tacit:_renderTreasuryBanner | 10 | tacit-specs/dapp/tacit.js:47956 |
| tacit:_showDiscordGateModal | 10 | tacit-specs/dapp/tacit.js:52193 |
| tacit:_renderClaimWizSteps | 10 | tacit-specs/dapp/tacit.js:53481 |
| tacit:verifyDiscoverAsset | 10 | tacit-specs/dapp/tacit.js:58754 |
| tacit:_classifySpendingTx | 10 | tacit-specs/dapp/tacit.js:60193 |
| tacit:_marketLiveCountsByAsset | 10 | tacit-specs/dapp/tacit.js:62182 |
| tacit:hydrateMarketImages | 10 | tacit-specs/dapp/tacit.js:66302 |
| tacit:_renderTileSparklineSVG | 10 | tacit-specs/dapp/tacit.js:68966 |
| tacit:refreshYourOpenOrdersPanel | 10 | tacit-specs/dapp/tacit.js:72939 |
| tacit:marketFulfilIntentHandler | 10 | tacit-specs/dapp/tacit.js:81708 |
| tacit:setupHoldingsButtons | 10 | tacit-specs/dapp/tacit.js:84016 |
| tacit:_matchesPill | 10 | tacit-specs/dapp/tacit.js:84122 |

## Most-Called Functions

| Function | Callers |
| --- | --- |
| tacit:escapeHtml | 1423 |
| tacit:BigInt | 1095 |
| tacit:Number | 1028 |
| tacit:bytesToHex | 666 |
| tacit:String | 579 |
| tacit:$ | 540 |
| tacit:toast | 499 |
| tacit:hexToBytes | 451 |
| Date.now | 420 |
| document.getElementById | 413 |
| Number.isFinite | 362 |
| Math.floor | 317 |
| Number.isInteger | 309 |
| payload.slice | 291 |
| Array.isArray | 270 |

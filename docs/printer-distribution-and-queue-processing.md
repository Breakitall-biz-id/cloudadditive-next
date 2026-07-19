# Printer Distribution and Queue Processing

Dokumen ini menjelaskan mekanisme distribusi order ke printer, aturan eligibility, scoring, dan queue processing yang saat ini dipakai CloudAdditive. Fokus dokumen ini adalah perilaku implementasi saat ini, bukan rancangan ideal.

## Tujuan Sistem

Sistem matching printer bertugas memilih printer terbaik untuk setiap order 3D printing berdasarkan kondisi fleet saat itu. Keputusan routing harus memenuhi dua hal:

- Menolak printer yang tidak layak secara operasional.
- Memberi ranking pada printer yang layak agar order tersebar sesuai jarak, antrian, dan kesiapan material.

Matching dipakai pada dua konteks:

- Customer order flow sebelum pembayaran, untuk memastikan pilihan printer masih valid.
- Midtrans webhook setelah pembayaran sukses, untuk re-evaluate printer dan memasukkan order ke queue produksi.

## Data Utama

Order membawa data berikut untuk matching:

- `materialId`: material yang diminta customer.
- `modelWidth`, `modelDepth`, `modelHeight`: dimensi model dalam mm.
- `shippingLat`, `shippingLng`: koordinat alamat customer.
- `estimatedPrintTime`: estimasi durasi print dalam menit.
- `quantity`: jumlah item.
- `dueDate`: target tanggal selesai/diterima customer, jika customer mengisi.

Printer membawa data berikut:

- `status`: `ONLINE`, `OFFLINE`, `PRINTING`, `PAUSED`, `ERROR`, atau `MAINTENANCE`.
- `lastSeenAt`: heartbeat terakhir dari printer/plugin.
- `isAcceptingOrders`: readiness toggle dari provider.
- `currentMaterialId`: material yang sedang loaded di printer.
- `materials`: material yang didukung printer.
- `buildWidth`, `buildDepth`, `buildHeight`: build volume maksimal.
- `provider.latitude`, `provider.longitude`: lokasi provider.
- active orders: order dengan status `IN_QUEUE`, `SLICING`, atau `PRINTING`.

## Eligibility Rules

Printer harus lolos semua rule berikut sebelum diberi skor.

| Rule | Kondisi Ditolak | Reason |
| --- | --- | --- |
| Online status | Printer bukan `ONLINE` | `OFFLINE`, `PRINTING`, `PAUSED`, `ERROR`, `MAINTENANCE`, atau `NOT_ONLINE` |
| Heartbeat | `lastSeenAt` kosong atau stale | `MISSING_HEARTBEAT`, `STALE_HEARTBEAT` |
| Accepting orders | `isAcceptingOrders = false` | `NOT_ACCEPTING` |
| Provider verified | Provider belum verified | `PROVIDER_UNVERIFIED` |
| Material support | Material order tidak ada di supported materials printer | `MATERIAL_UNSUPPORTED` |
| Build volume | Dimensi model melebihi build volume printer | `MODEL_TOO_LARGE` |
| Lokasi | Koordinat provider/customer tidak valid | `LOCATION_UNAVAILABLE` |
| Jarak | Jarak customer ke provider melebihi `matchingMaxDistanceKm` | `TOO_FAR` |
| Queue duration | Projected queue melebihi `matchingMaxQueueMinutes` | `QUEUE_DURATION_LIMIT` |
| Queue jobs | Projected job count melebihi `matchingMaxQueueJobs` | `QUEUE_JOB_LIMIT` |

Catatan penting untuk material:

- `materials` adalah daftar material yang didukung printer.
- `currentMaterialId` adalah material yang sedang loaded.
- Saat ini `currentMaterialId` juga dipakai sebagai fallback supported material agar printer fresh DB tidak salah ditolak.
- Jika printer support material order tetapi loaded material berbeda, printer tetap eligible tetapi tidak bisa print langsung.

Catatan penting untuk dimensi:

- Dimensi sekarang adalah hard filter, bukan faktor ranking.
- Model kecil tetap boleh dikirim ke printer sedang/besar selama masih muat di build volume.
- Printer hanya ditolak jika salah satu dimensi model lebih besar dari kapasitas printer.

## Scoring Rules

Printer yang lolos eligibility diberi skor weighted-sum. Komponen skor saat ini:

| Komponen | Makna | Semakin Baik Jika |
| --- | --- | --- |
| Distance score | Jarak customer-provider dinormalisasi terhadap max distance | Provider makin dekat |
| Queue duration score | Waktu tunggu antrian sebelum order ini | Waktu tunggu makin pendek |
| Queue count score | Jumlah job di depan order ini | Jumlah job makin sedikit |
| Loaded material score | Apakah material loaded sama dengan material order | Material loaded cocok |

Formula konseptual:

```text
score =
  distanceScore * distanceWeight +
  queueDurationScore * queueDurationWeight +
  queueCountScore * queueCountWeight +
  loadedMaterialScore * loadedMaterialWeight
```

Default/current config dibaca dari `SystemSettings` melalui matching config:

- `matchingAlgorithmMode`
- `matchingDistanceWeight`
- `matchingQueueDurationWeight`
- `matchingQueueCountWeight`
- `matchingLoadedMaterialWeight`
- `matchingHeartbeatTimeoutSeconds`
- `matchingMaxDistanceKm`
- `matchingMaxQueueMinutes`
- `matchingMaxQueueJobs`
- `matchingNsga2PopulationSize`
- `matchingNsga2Generations`
- `matchingNsga2MutationRate`
- `matchingNsga2CrossoverRate`
- `matchingNsga2Seed`
- `matchingNsga2DecisionPolicy`

Tie-breaker sorting setelah skor:

- Skor tertinggi menang.
- Jika skor sama, wait minutes lebih kecil menang.
- Jika masih sama, jobs ahead lebih kecil menang.
- Jika masih sama, distance lebih dekat menang.
- Jika masih sama, `printerId` dipakai agar deterministic.

## Queue Projection

Queue projection menghitung dampak antrian aktif terhadap printer. Status yang dihitung sebagai active queue:

- `IN_QUEUE`
- `SLICING`
- `PRINTING`

Untuk setiap kandidat printer, sistem menghitung:

- `waitMinutes`: estimasi waktu sebelum order baru bisa mulai.
- `jobsAhead`: jumlah job yang berada di depan order.
- `incomingMinutes`: estimasi waktu order baru plus preprocessing.
- `projectedMinutesAfter`: total projected queue setelah order dimasukkan.
- `projectedJobsAfter`: total job setelah order dimasukkan.

Pada Matching Lab batch simulation, setiap skenario yang berhasil dialokasikan menambah virtual queue ke printer terpilih sebelum skenario berikutnya dihitung. Ini membuat simulasi batch lebih realistis karena skenario kedua melihat dampak skenario pertama.

## Customer Order Flow

Flow customer order saat ini:

1. Customer upload file dan mengisi material, kualitas, quantity, alamat.
2. Sistem menganalisis file untuk dimensi dan estimasi print time jika data tersedia.
3. Sistem menjalankan printer matching untuk order tersebut.
4. Jika tidak ada printer eligible, checkout ditolak sebelum pembayaran.
5. Jika ada printer eligible, order dibuat dengan status `PENDING_PAYMENT`.
6. Order menyimpan `printerId` dan `providerId` dari matching result.
7. Customer lanjut ke Midtrans payment.

Pre-payment matching berfungsi sebagai guard agar customer tidak membayar order yang jelas tidak bisa diroute.

## Payment and Assignment Flow

Midtrans webhook adalah titik penting untuk mengubah order dari payment state ke production queue.

Saat payment menjadi `PAID`:

1. Sistem mengambil order berdasarkan `orderNumber`.
2. Sistem menjalankan matching ulang berdasarkan data order terbaru.
3. Jika matching sukses:
   - order menjadi `IN_QUEUE`
   - `printerId` dan `providerId` di-update ke best printer terbaru
   - `queuePosition` dihitung dari jumlah order `IN_QUEUE` pada printer itu
4. Jika matching gagal:
   - order menjadi `CONFIRMED`
   - `printerId` dan `providerId` dikosongkan
   - order perlu intervensi/manual assignment
5. Setelah settlement berhasil diproses, sistem memanggil `processQueueForPrinter(printerId)` jika ada printer assigned.

Alasan matching ulang setelah payment:

- Kondisi printer bisa berubah antara checkout dan pembayaran.
- Printer bisa offline, heartbeat stale, berubah material, atau antrian bertambah.
- Sistem menghindari mengunci keputusan routing yang sudah tidak valid.

## Queue Processing Logic

Function utama:

```text
processQueueForPrinter(printerId)
```

Langkahnya:

1. Load matching config, terutama heartbeat timeout.
2. Ambil printer berdasarkan `printerId`.
3. Stop jika printer tidak bisa start:
   - printer tidak ditemukan
   - status bukan `ONLINE`
   - `isAcceptingOrders = false`
   - heartbeat kosong/stale
   - `currentMaterialId` kosong
4. Cari order paling depan untuk printer tersebut dengan filter:
   - `printerId` sama
   - `status = IN_QUEUE`
   - `materialId = printer.currentMaterialId`
5. Urutan queue:
   - `queuePosition asc`
   - `createdAt asc`
6. Recheck state printer sekali lagi sebelum start.
7. Jika state masih valid dan material masih cocok, panggil `startOrderPrint(orderId, printerId)`.
8. Jika start sukses, order menjadi `PRINTING`.
9. Jika start gagal, order tetap di queue dan error dicatat di log.

Queue processing hanya memproses satu order per pemanggilan. Setelah job selesai atau printer readiness berubah, function ini dipanggil lagi untuk mengambil order berikutnya.

## Queue Processing Triggers

Queue processing dipanggil pada beberapa event:

| Trigger | Efek |
| --- | --- |
| Payment webhook berhasil membuat order `IN_QUEUE` | Coba start order baru pada printer assigned |
| Provider mengubah printer dari not accepting ke accepting | Coba start order paling depan yang materialnya cocok |
| Provider/manual status update membuat order keluar dari `PRINTING` | Coba start order berikutnya |
| Printer plugin mengirim `PrintDone` | Order aktif menjadi `POST_PROCESSING`, lalu queue berikutnya diproses |
| Printer plugin mengirim `PrintFailed` atau `PrintCancelled` | Order aktif dikembalikan ke `IN_QUEUE`, lalu queue diproses lagi |

## Start Print Guards

Sebelum sistem benar-benar mengirim job ke OctoPrint/plugin, ada guard tambahan:

- Printer harus `ONLINE`.
- Printer harus accepting orders.
- Heartbeat harus fresh.
- `currentMaterialId` harus sama dengan `order.materialId`.
- Order harus punya `gcodeFileUrl`.
- Untuk direct OctoPrint integration, printer harus punya `octoprintUrl` dan `octoprintApiKey`.

Guard ini penting karena matching bisa terjadi beberapa detik/menit sebelum start print. State printer bisa berubah di antara dua momen itu.

## Loaded Material Behavior

Jika tidak ada printer yang loaded material-nya cocok, belum tentu order ditolak.

Perilaku saat ini:

- Jika printer support material order tetapi loaded material berbeda, printer masih eligible.
- Printer tersebut mendapat `loadedMaterialScore = 0`.
- `canPrintImmediately = false`.
- Jika tetap menang, order masuk `IN_QUEUE` dan menunggu printer load material yang sesuai.
- Queue processing hanya akan mengambil order ketika `printer.currentMaterialId === order.materialId`.

Order ditolak hanya jika tidak ada printer yang eligible sama sekali. Contohnya semua printer:

- tidak support material,
- terlalu jauh,
- offline/stale,
- tidak accepting,
- provider unverified,
- model terlalu besar,
- atau queue sudah melewati limit.

## Dimension Behavior

Dimensi model saat ini dipakai sebagai eligibility gate:

```text
modelWidth <= buildWidth
modelDepth <= buildDepth
modelHeight <= buildHeight
```

Jika semua kondisi itu benar, printer lolos dari sisi dimensi. Sistem tidak mencoba mencari printer dengan ukuran paling efisien.

Contoh:

- Model `20 x 20 x 20 mm`, printer `220 x 220 x 250 mm`: eligible.
- Model `20 x 20 x 20 mm`, printer `300 x 300 x 300 mm`: eligible.
- Model `230 x 20 x 20 mm`, printer `220 x 220 x 250 mm`: rejected `MODEL_TOO_LARGE`.

Jika ke depan ingin lebih efisien, bisa ditambah `dimensionFitScore`, tetapi itu belum dipakai saat ini.

## Matching Lab

Matching Lab di admin adalah simulasi read-only.

Fungsinya:

- Mengubah matching weights/config.
- Membuat satu atau banyak skenario order.
- Upload STL/G-code untuk analisis durasi/dimensi.
- Menginput lokasi via peta.
- Menjalankan dry run tanpa membuat order, payment, assignment, atau audit produksi.
- Melihat matched/rejected result dan alasan rejection.
- Melihat distribusi alokasi pada peta.

Matching Lab membantu admin menguji efek config sebelum dipakai di production flow.

Mode algoritma yang tersedia:

- `WEIGHTED_SCORE`: mode default/current, skenario batch diproses berurutan memakai skor weighted-sum dan virtual queue.
- `NSGA2`: mode eksperimen untuk Matching Lab, mengevaluasi batch sebagai multi-objective optimization lalu memilih satu solusi dari Pareto front sesuai decision policy admin.

## Known Limitations Saat Ini

Beberapa hal yang perlu diperhatikan:

- Queue processing memulai satu order per invocation, bukan loop sampai queue kosong.
- Dimension hanya hard filter, belum jadi faktor optimasi ukuran printer.
- Production routing masih memakai weighted-score realtime; NSGA-II baru diaktifkan untuk Matching Lab/simulation agar dampaknya bisa dibandingkan dulu.
- Order yang dibayar tetapi gagal matching saat webhook menjadi `CONFIRMED`, sehingga butuh manual follow-up.
- Jika provider support material lebih dari loaded material, UI/flow perlu memastikan relasi material printer terisi benar.
- Loaded material mismatch bisa membuat order menunggu sampai provider mengganti material.
- `queuePosition` dihitung saat payment settlement untuk order `IN_QUEUE`, tetapi rebalancing queue lanjutan masih sederhana.

## NSGA-II Overview

NSGA-II adalah singkatan dari Non-dominated Sorting Genetic Algorithm II. Ini adalah algoritma evolutionary multi-objective optimization.

Konsep utamanya:

- Dipakai ketika ada beberapa objektif yang saling trade-off.
- Tidak memaksa semua objektif digabung menjadi satu skor weighted-sum.
- Menghasilkan Pareto frontier, yaitu kumpulan solusi yang tidak saling mendominasi.
- Memakai non-dominated sorting untuk mengelompokkan solusi berdasarkan kualitas Pareto.
- Memakai crowding distance agar solusi tidak menumpuk di satu area frontier.
- Cocok untuk masalah optimasi yang objektifnya banyak dan konflik, misalnya biaya vs waktu vs fairness vs utilisasi.

Dalam konteks CloudAdditive, NSGA-II bisa dipakai jika matching printer ingin mengoptimalkan banyak tujuan sekaligus, misalnya:

- Minim jarak pengiriman.
- Minim waktu tunggu.
- Maksimal fairness distribusi order antar provider.
- Maksimal utilisasi printer.
- Minim pergantian material.
- Minim makespan batch order.
- Hindari overloading provider tertentu.

Implementasi saat ini menyediakan NSGA-II sebagai mode simulasi di Matching Lab. Production order routing tetap memakai weighted scoring karena lebih sederhana, deterministik, mudah dijelaskan ke admin, dan aman untuk realtime checkout/webhook.

Objektif NSGA-II yang dipakai di Matching Lab:

- Minim jumlah order rejected.
- Minim projected makespan batch.
- Minim total wait time.
- Minim total distance.
- Minim imbalance distribusi antar provider.
- Minim loaded material mismatch.
- Minim order yang diproyeksikan melewati due date.

## Weighted Scoring vs NSGA-II

| Aspek | Weighted Scoring Saat Ini | NSGA-II |
| --- | --- | --- |
| Kompleksitas | Rendah | Tinggi |
| Explainability | Mudah dijelaskan | Lebih sulit dijelaskan |
| Runtime | Cepat | Lebih berat |
| Konfigurasi admin | Langsung via weights | Perlu parameter populasi/generasi/objectives |
| Cocok untuk single order | Sangat cocok | Biasanya overkill |
| Cocok untuk batch besar | Cukup, tapi greedy | Lebih cocok |
| Output | Satu ranking linear | Pareto frontier / pilihan trade-off |

Rekomendasi pragmatis:

- Tetap pakai weighted scoring untuk realtime customer checkout.
- Pertimbangkan NSGA-II untuk offline/batch routing di Matching Lab jika order volume tinggi dan fairness antar provider mulai penting.
- Jika NSGA-II dipakai, jangan langsung mengganti production routing. Mulai sebagai simulation mode di Matching Lab untuk membandingkan hasil weighted scoring vs Pareto optimization.

## Suggested Next Improvements

Prioritas teknis yang paling relevan:

1. Tambahkan dimension fit score sebagai optional weight admin.
2. Tambahkan queue rebalancing policy untuk order yang terlalu lama menunggu karena material mismatch.
3. Tambahkan background worker atau scheduled queue processor agar tidak hanya bergantung pada event trigger.
4. Tambahkan admin view untuk order `CONFIRMED` yang gagal assignment setelah payment.
5. Tambahkan comparison mode yang menjalankan weighted scoring dan NSGA-II bersamaan dalam satu dry run.
6. Tambahkan audit event khusus untuk matching decision agar alasan routing bisa ditelusuri per order.

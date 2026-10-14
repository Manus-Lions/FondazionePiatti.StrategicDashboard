# Fondazione Piatti - Strategic Dashboard

Cruscotto locale per collegare i cantieri di ottimizzazione e automazione al Piano Strategico 2025-2030 e al Piano Esecutivo 2026-2027.

## Contenuti

- portafoglio ordinato per beneficio potenziale;
- KPI, fasi, owner, proposta, rischi e luoghi concreti per ogni intervento;
- vista benefici con potenziale annuo, previsione ponderata e consuntivo misurato;
- vista logica con gate decisionali e screening legale, sindacale e privacy;
- cantiere dedicato alla revisione di contratti e fornitori;
- mappa dei contesti e roadmap per fase;
- registro unico delle domande da porre alla Direzione, ordinato da priorità 1 a 5;
- registro delle fonti già verificate e dei dati interni da acquisire.

## Avvio in Visual Studio

1. Aprire `FondazionePiatti.StrategicDashboard.sln` con Visual Studio 2022.
2. Impostare `FondazionePiatti.StrategicDashboard` come progetto di avvio.
3. Premere `F5` oppure `Ctrl+F5`.

In alternativa, dalla cartella del progetto:

```powershell
dotnet run --project .\src\FondazionePiatti.StrategicDashboard
```

Il browser si apre su `http://localhost:5280`.

## Come sono organizzati i dati

- `wwwroot/data/portfolio.json`: direttrici strategiche, interventi, benefici, KPI, fasi, contesti, domande e fonti.
- `wwwroot/app.js`: filtri, viste, modifiche locali, esportazione e persistenza nel browser.
- `wwwroot/styles.css`: interfaccia responsive.

Le modifiche effettuate dall'interfaccia sono salvate nel `localStorage` del browser. Il pulsante **Esporta JSON** scarica lo stato corrente, mentre **Ripristina base** torna ai dati di `portfolio.json`.

## Regole di calcolo dei benefici

- **Potenziale annuo lordo**: somma degli intervalli delle sole voci con una base economica esplicita.
- **Previsione ponderata residua**: punto medio dell'intervallo moltiplicato per la confidenza delle evidenze, al netto del beneficio già misurato.
- **Beneficio misurato**: valore inserito a consuntivo con periodo e fonte; non viene ricavato automaticamente dalle ore liberate.
- Le voci prive di baseline restano **non monetizzate** e non entrano nei totali economici.

Le stime iniziali sono scenari decisionali, non budget né utile netto. Il valore economico va validato dal Controllo di Gestione evitando doppi conteggi e includendo costi di implementazione e transizione.

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/pages.yml` pubblica automaticamente il contenuto statico di `wwwroot` a ogni push sul branch `main`. Nel repository GitHub, la sorgente di Pages deve essere impostata su **GitHub Actions**.

L'applicazione ASP.NET Core resta disponibile per l'esecuzione locale, mentre GitHub Pages distribuisce soltanto HTML, CSS, JavaScript e il dataset JSON pubblico.

## Limite metodologico

Il Piano Strategico Esecutivo 2026-2027 integrale non è stato fornito. La prima mappatura utilizza le direttrici e i progetti esplicitati nel Bilancio Sociale 2025. Il cruscotto contrassegna come **da verificare** gli elementi che richiedono documenti o dati interni.

Le valutazioni legali e sindacali presenti nel cruscotto costituiscono uno screening operativo preliminare e devono essere validate sul caso concreto da DPO/RPD, consulente del lavoro, Direzione e rappresentanze sindacali competenti.

import { GeneratorPage, useGenerator } from '../../domain/generator/ui';
import { SeedExportReminder, SetupPage, UnlockPage, useSession } from '../../domain/session/ui';

function downloadSeedFile(seed: Uint8Array) {
  const buffer = new ArrayBuffer(seed.length);
  new Uint8Array(buffer).set(seed);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'seed.key';
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const session = useSession();
  const generator = useGenerator();

  const handleExportSeed = async () => {
    const seed = await session.exportSeed();
    if (seed) {
      downloadSeedFile(seed);
    }
  };

  const renderContent = () => {
    if (session.isLoading) {
      return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>;
    }

    if (session.isUnlocked) {
      return (
        <>
          {!session.seedExported && (
            <div className="mb-4">
              <SeedExportReminder
                onExport={handleExportSeed}
                onDismiss={session.dismissExportReminder}
              />
            </div>
          )}
          <GeneratorPage
            realm={generator.realm}
            password={generator.password}
            isGenerating={generator.isGenerating}
            error={generator.error}
            onRealmChange={generator.setRealm}
            onGenerate={generator.generate}
            onFill={generator.fill}
            onLock={session.lock}
          />
        </>
      );
    }

    if (!session.hasSeed) {
      return (
        <SetupPage
          onSetup={session.setupSeed}
          onImport={session.importSeed}
          isLoading={session.isLoading}
          error={session.error}
        />
      );
    }

    return (
      <UnlockPage
        onUnlock={session.unlock}
        onImport={session.importSeed}
        isLoading={session.isLoading}
        error={session.error}
      />
    );
  };

  return (
    <div className="w-80 p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">TSKey</h1>
        <p className="text-xs text-gray-500">Vaultless Password Manager</p>
      </div>
      {renderContent()}
    </div>
  );
}

export default App;

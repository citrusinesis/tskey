import { GeneratorPage, UnlockPage, useGenerator, useSession } from '../../popup';

function App() {
  const session = useSession();
  const generator = useGenerator();

  return (
    <div className="w-80 p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">TSKey</h1>
        <p className="text-xs text-gray-500">Vaultless Password Manager</p>
      </div>

      {session.isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
      ) : session.isUnlocked ? (
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
      ) : (
        <UnlockPage onUnlock={session.unlock} isLoading={session.isLoading} error={session.error} />
      )}
    </div>
  );
}

export default App;

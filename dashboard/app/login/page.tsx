export default function LoginPage({ searchParams }: { searchParams: { errore?: string } }) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Gestione Social DJ</h1>
        <p className="note">Accesso riservato alla dashboard.</p>
        <form action="/api/login" method="post">
          <input type="password" name="password" placeholder="Password" autoFocus required />
          <button type="submit">Entra</button>
        </form>
        {searchParams.errore && <p className="error-msg">Password errata, riprova.</p>}
      </div>
    </div>
  );
}

export default function AuthSuccess() {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          {/* Logo o imagen */}
          <img 
            src="/logo.png" 
            alt="DriveSkore"
            style={{
              width: '400px',
              height: 'auto',
              marginBottom: '20px',
              objectFit: 'contain'
            }}
          />
          
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
          
          <h1 style={{ 
            fontSize: '32px', 
            marginBottom: '16px',
            color: '#1a1a1a',
            fontWeight: 'bold'
          }}>
            ¡Email Confirmado!
          </h1>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '30px',
            lineHeight: '1.6'
          }}>
            Tu cuenta ha sido verificada correctamente.<br/>
            Ya puedes empezar a usar DriveSkore.
          </p>
          
          <a 
            href="driveskore://"
            style={{
              display: 'inline-block',
              backgroundColor: '#007AFF',
              color: 'white',
              padding: '16px 40px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: '0 4px 15px rgba(0,122,255,0.3)',
              transition: 'transform 0.2s'
            }}
          >
            Abrir DriveSkore
          </a>
          
          <p style={{ 
            fontSize: '13px', 
            color: '#999', 
            marginTop: '25px',
            lineHeight: '1.5'
          }}>
            ¿No tienes la app instalada?<br/>
            <a 
              href="https://driveskore.vercel.app" 
              style={{ color: '#007AFF', textDecoration: 'none' }}
            >
              Descárgala aquí
            </a>
          </p>
        </div>
      </div>
    );
  }
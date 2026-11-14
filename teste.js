/* teste.js - pagina de teste do DiaristaExpress no computador.
 *
 * Uma vista por vez: "Computador" (o app na janela inteira, como no site)
 * ou "Celular" (um aparelho de 390 x 844, reduzido so' se nao couber).
 * Trocar de vista nao recarrega o app - so' muda o tamanho, e o app se
 * reorganiza na hora; a escolha fica lembrada para a proxima vez.
 *
 * Atualizacao: le o manifesto do canal ao abrir, a cada 2 minutos e quando a
 * janela volta ao foco. Saiu versao nova? Aparece "Atualizar para X" na barra.
 * Clicar na versao procura na hora.
 */
(function () {
  var CHAVE_APP = 'dx:app';
  var CHAVE_MODO = 'dx-teste:modo';
  var INTERVALO = 2 * 60 * 1000;
  var versaoCarregada = null;
  var $ = function (id) { return document.getElementById(id); };
  var quadro = $('quadro');
  var tela = document.querySelector('.tela');

  // Aberta num celular de verdade: vai direto para o app.
  if (window.matchMedia('(max-width: 760px) and (pointer: coarse)').matches) {
    location.replace('./');
    return;
  }

  function ler(chave, padrao) { try { return localStorage.getItem(chave) || padrao; } catch (e) { return padrao; } }
  function gravar(chave, valor) { try { localStorage.setItem(chave, valor); } catch (e) { /* sem armazenamento */ } }

  // ------------------------------------------------------------- app
  function appAtual() { return ler(CHAVE_APP, 'cliente') === 'diarista' ? 'diarista' : 'cliente'; }

  function carregar(v) {
    gravar(CHAVE_APP, appAtual());
    // versao, app e hora no endereco: o navegador nunca usa o app velho e a
    // troca de app sempre recarrega.
    quadro.src = './index.html?v=' + encodeURIComponent(v || 'sem-canal') + '&app=' + appAtual() + '&t=' + Date.now() + '#/';
  }

  $('qual-app').value = appAtual();
  $('qual-app').addEventListener('change', function (e) {
    gravar(CHAVE_APP, e.target.value);
    carregar(versaoCarregada);
  });

  // ------------------------------------------------------------- vista
  function modoAtual() { return ler(CHAVE_MODO, 'computador') === 'celular' ? 'celular' : 'computador'; }

  function ajustar() {
    if (modoAtual() !== 'celular') {
      tela.style.transform = '';
      return;
    }
    var area = document.querySelector('.vista');
    var s = Math.min((area.clientHeight - 40) / 864, (area.clientWidth - 40) / 410, 1);
    tela.style.transform = 'scale(' + s + ')';
  }

  function aplicarModo(modo) {
    gravar(CHAVE_MODO, modo);
    document.body.classList.toggle('modo-computador', modo === 'computador');
    document.body.classList.toggle('modo-celular', modo === 'celular');
    var botoes = document.querySelectorAll('[data-modo]');
    for (var i = 0; i < botoes.length; i++) botoes[i].setAttribute('aria-pressed', String(botoes[i].dataset.modo === modo));
    ajustar();
  }

  var botoesModo = document.querySelectorAll('[data-modo]');
  for (var i = 0; i < botoesModo.length; i++) {
    botoesModo[i].addEventListener('click', function (e) { aplicarModo(e.currentTarget.dataset.modo); });
  }
  window.addEventListener('resize', ajustar);

  // ------------------------------------------------------------- versao
  function lerManifesto() {
    return fetch('./atualizacoes/manifesto.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function mostrarVersao(texto) { $('versao').textContent = texto; }

  function procurar(manual) {
    return lerManifesto().then(function (m) {
      if (!m || !m.versao) {
        if (manual) mostrarVersao('sem conexão');
        return;
      }
      if (!versaoCarregada) {
        versaoCarregada = m.versao;
        mostrarVersao('versão ' + m.versao);
        carregar(m.versao);
        return;
      }
      if (m.versao !== versaoCarregada) {
        $('novidade').textContent = 'Atualizar para ' + m.versao;
        $('novidade').dataset.versao = m.versao;
        $('novidade').hidden = false;
      } else if (manual) {
        mostrarVersao('versão ' + m.versao + ' · a mais nova');
        setTimeout(function () { mostrarVersao('versão ' + versaoCarregada); }, 2500);
      }
    });
  }

  $('novidade').addEventListener('click', function (e) {
    versaoCarregada = e.currentTarget.dataset.versao;
    e.currentTarget.hidden = true;
    mostrarVersao('versão ' + versaoCarregada);
    carregar(versaoCarregada);
  });
  $('versao').addEventListener('click', function () { procurar(true); });
  window.addEventListener('focus', function () { procurar(false); });
  setInterval(function () { procurar(false); }, INTERVALO);

  aplicarModo(modoAtual());
  procurar(false).then(function () {
    if (!versaoCarregada) carregar(null); // sem canal: abre assim mesmo
  });
})();

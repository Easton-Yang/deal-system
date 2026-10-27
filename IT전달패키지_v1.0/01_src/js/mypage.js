// 본인 계정의 프로필과 비밀번호만 Supabase Auth를 통해 수정합니다.
(() => {
  const $ = id => document.getElementById(id);
  function status(id, text, type = 'info') {
    const box = $(id);
    box.className = 'mt-3 alert alert-' + type;
    box.textContent = text;
  }
  function showProfile(user) {
    const meta = user.user_metadata || {};
    $('profileEmail').value = user.email || '';
    $('passwordUsername').value = user.email || '';
    $('profileName').value = displayUserName(meta.full_name || (user.email || '').split('@')[0]) || '';
    $('profileDepartment').value = meta.department || '';
    $('profileJobTitle').value = meta.job_title || '';
  }
  let accountId = null;
  async function ownUser() {
    const { data, error } = await getSB().auth.getUser();
    if (error || !data.user || data.user.id !== accountId) {
      throw new Error('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
    }
    return data.user;
  }
  renderNav('mypage');
  async function init() {
    if (DEMO_MODE) {
      showProfile({ email: '', user_metadata: { full_name: '데모사용자' } });
      status('pageStatus', '데모 모드에서는 프로필과 비밀번호를 변경할 수 없습니다.', 'warning');
      return;
    }
    if (!await guardPage()) return;
    try {
      const { data, error } = await getSB().auth.getUser();
      if (error || !data.user) throw error || new Error('계정 정보를 불러오지 못했습니다.');
      accountId = data.user.id;
      showProfile(data.user);
      $('profileFields').disabled = false;
      $('passwordFields').disabled = false;
      $('pageStatus').textContent = '';
    } catch (err) {
      status('pageStatus', '내 정보 불러오기 실패: ' + err.message, 'danger');
    }
  }
  $('profileForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (DEMO_MODE || $('profileFields').disabled || !$('profileForm').reportValidity()) return;
    const name = $('profileName').value.trim();
    if (!name) { status('profileStatus', '이름을 입력해주세요.', 'warning'); return; }
    $('profileFields').disabled = true;
    status('profileStatus', '프로필을 저장하고 있습니다...');
    try {
      await ownUser();
      const { data, error } = await getSB().auth.updateUser({ data: {
        full_name: name,
        department: $('profileDepartment').value.trim(),
        job_title: $('profileJobTitle').value.trim()
      } });
      if (error) throw error;
      if (!data.user || data.user.id !== accountId) throw new Error('저장 결과를 확인하지 못했습니다. 다시 시도해주세요.');
      _sessionUser = userFromSession({ user: data.user });
      updateCurrentUserInSidebar();
      showProfile(data.user);
      status('profileStatus', '프로필을 저장했습니다.', 'success');
    } catch (err) {
      status('profileStatus', '프로필 저장 실패: ' + err.message, 'danger');
    } finally {
      $('profileFields').disabled = false;
    }
  });
  $('passwordForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (DEMO_MODE || $('passwordFields').disabled || !$('passwordForm').reportValidity()) return;
    const current = $('currentPassword').value;
    const next = $('newPassword').value;
    if (next !== $('confirmPassword').value) {
      status('passwordStatus', '새 비밀번호가 서로 일치하지 않습니다.', 'warning'); return;
    }
    if (current === next) {
      status('passwordStatus', '현재 비밀번호와 다른 새 비밀번호를 입력해주세요.', 'warning'); return;
    }
    $('passwordFields').disabled = true;
    status('passwordStatus', '현재 비밀번호를 확인하고 있습니다...');
    try {
      const user = await ownUser();
      // 현재 비밀번호는 로그인 검증에만 사용하며 어디에도 저장하지 않습니다.
      const verified = await getSB().auth.signInWithPassword({ email: user.email, password: current });
      if (verified.error) {
        if (verified.error.code === 'invalid_credentials' || /invalid login credentials/i.test(verified.error.message)) {
          throw new Error('현재 비밀번호가 맞지 않습니다.');
        }
        throw new Error('현재 비밀번호 확인 실패: ' + verified.error.message);
      }
      if (!verified.data.user || verified.data.user.id !== accountId) throw new Error('계정이 변경됐습니다. 다시 로그인해주세요.');
      status('passwordStatus', '새 비밀번호로 변경하고 있습니다...');
      const { error } = await getSB().auth.updateUser({ password: next });
      if (error) {
        if (error.code === 'reauthentication_needed' || /reauthenticat/i.test(error.message)) {
          throw new Error('추가 본인 확인이 필요합니다. 로그아웃 후 다시 로그인해 변경해주세요.');
        }
        throw error;
      }
      status('passwordStatus', '비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 사용하세요.', 'success');
    } catch (err) {
      status('passwordStatus', '비밀번호 변경 실패: ' + err.message, 'danger');
    } finally {
      $('passwordForm').reset();
      $('passwordUsername').value = $('profileEmail').value;
      $('passwordFields').disabled = false;
    }
  });
  init();
})();

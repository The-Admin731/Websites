/**
 * TATTOO APPOINTMENT BOOKING FORM - FRONTEND LOGIC
 * Corrected: Multiple File Accumulator + Delete Feature + Radio Card Toggle
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwAzPfALVAEPNh9ULyj5B9gyDTryWcHW_6MWKk3kha9vwTy4HnMH-65FLa49575cBEPSw/exec";
const JOSE_PHONE_NUMBER = "3127193208"; 

// Arreglo global para almacenar los archivos acumulados
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
  // Bindings principales
  const form = document.getElementById('bookingForm');
  const customFieldsGroup = document.getElementById('customFields');
  const fileInput = document.getElementById('references');
  const fileList = document.getElementById('fileList');
  const fileCount = document.getElementById('fileCount');
  const submitBtn = document.getElementById('submitBtn');
  const formStatus = document.getElementById('formStatus');
  const cardFlash = document.getElementById('cardFlash');
  const cardCustom = document.getElementById('cardCustom');
  const projectTypeInputs = document.querySelectorAll('input[name="projectType"]');
  const smsFallbackContainer = document.getElementById('sms-fallback-container') || createSmsContainer();

  if (!form) return;

  // 1. Selector de Flash / Custom mediante Tarjetas Radio
  projectTypeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const selectedValue = e.target.value;

      if (cardFlash && cardCustom) {
        if (selectedValue === 'Flash') {
          cardFlash.classList.add('active');
          cardCustom.classList.remove('active');
        } else {
          cardCustom.classList.add('active');
          cardFlash.classList.remove('active');
        }
      }

      if (customFieldsGroup) {
        if (selectedValue === 'Custom') {
          customFieldsGroup.classList.remove('hidden');
          if (fileInput) fileInput.required = true;
        } else {
          customFieldsGroup.classList.add('hidden');
          if (fileInput) fileInput.required = false;
        }
      }
    });
  });

  // 2. Campo condicional para Estilo Mixto
  const colorTypeSelect = document.getElementById('colorType');
  const mixedDetailsGroup = document.getElementById('mixedDetailsGroup');
  if (colorTypeSelect && mixedDetailsGroup) {
    colorTypeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Mixto') {
        mixedDetailsGroup.classList.remove('hidden');
      } else {
        mixedDetailsGroup.classList.add('hidden');
      }
    });
  }

  // 3. LOGICA DE IMÁGENES: Acumular, Renderizar y Borrar
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const newFiles = Array.from(e.target.files);

      // Verificar que no sobrepase el límite de 3 imágenes
      if (selectedFiles.length + newFiles.length > 3) {
        alert('You can only attach a maximum of 3 reference images.');
        fileInput.value = '';
        return;
      }

      // Validar tamaño individual (Máx 5MB)
      for (const file of newFiles) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`The file "${file.name}" exceeds the 5 MB limit.`);
          fileInput.value = '';
          return;
        }
      }

      // Agregar los nuevos archivos al arreglo acumulado
      selectedFiles = selectedFiles.concat(newFiles);
      updateFileInputAndList();
    });
  }

  // Función para renderizar la lista e integrar con el input file
  function updateFileInputAndList() {
    // Sincronizar con el elemento input mediante DataTransfer
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    if (fileInput) fileInput.files = dt.files;

    // Actualizar contador
    if (fileCount) {
      fileCount.textContent = `${selectedFiles.length} / 3 images selected`;
    }

    // Renderizar la lista visual con botón de eliminar
    if (fileList) {
      fileList.innerHTML = '';
      selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-top: 0.4rem; padding: 0.4rem 0.6rem; background: #f0f0f0; border-radius: 4px; font-size: 0.85rem;';
        
        li.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
          <button type="button" style="background: none; border: none; color: #d93025; font-weight: bold; cursor: pointer; padding: 2px 6px; font-size: 0.9rem;" onclick="removeFile(${index})">✕</button>
        `;
        fileList.appendChild(li);
      });
    }
  }

  // Hacer accesible globalmente la función de borrar archivo
  window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    updateFileInputAndList();
  };

  // 4. Manejo del Envío del Formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn && submitBtn.disabled) return;

    if (formStatus) {
      formStatus.textContent = '';
      formStatus.style.color = '';
    }
    if (smsFallbackContainer) smsFallbackContainer.innerHTML = '';

    // Validar Honeypot
    const companyRef = form.querySelector('[name="company_ref"]')?.value || '';
    if (companyRef.trim() !== '') {
      if (formStatus) {
        formStatus.style.color = '#d93025';
        formStatus.textContent = 'Could not process request. Please try again.';
      }
      return;
    }

    // Bloquear botón durante el envío
    if (submitBtn) submitBtn.disabled = true;
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit Appointment Request';
    if (submitBtn) submitBtn.textContent = 'Sending request...';

    if (formStatus) {
      formStatus.style.color = '#0066cc';
      formStatus.textContent = 'Processing request and uploading reference images...';
    }

    try {
      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };

      const fullName = getVal('fullName');
      const phone = getVal('phone');
      const projectType = form.querySelector('input[name="projectType"]:checked')?.value || 'Flash';
      
      const colorTypeRaw = getVal('colorType');
      const mixedDetails = getVal('mixedDetails');
      const colorType = (colorTypeRaw === 'Mixto' && mixedDetails) 
        ? `Mixto (${mixedDetails})` 
        : colorTypeRaw;

      const size = getVal('size');
      const bodyLocation = getVal('bodyLocation');
      const budget = getVal('budget');
      const availability = getVal('availability');
      const depositTier = getVal('depositTier');
      const notes = getVal('notes');

      if (!fullName || !phone) {
        throw { type: 'validation', message: 'Please complete all required fields.' };
      }

      if (projectType === 'Custom') {
        if (!colorTypeRaw || !size || !bodyLocation || !budget || !availability) {
          throw { type: 'validation', message: 'Please fill out all custom project details.' };
        }
        if (selectedFiles.length === 0) {
          throw { type: 'validation', message: 'Please attach at least 1 reference image for Custom projects.' };
        }
      }

      // Convertir archivos acumulados a Base64
      const filesPayload = [];
      if (projectType === 'Custom' && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const base64Data = await readFileAsBase64(file);
          filesPayload.push({
            filename: file.name,
            mimeType: file.type,
            base64: base64Data
          });
        }
      }

      const payload = {
        fullName,
        phone,
        projectType,
        colorType: projectType === 'Custom' ? colorType : '',
        size: projectType === 'Custom' ? size : '',
        bodyLocation: projectType === 'Custom' ? bodyLocation : '',
        budget: projectType === 'Custom' ? budget : '',
        availability: projectType === 'Custom' ? availability : '',
        depositStatus: projectType === 'Custom' ? depositTier : '',
        notes,
        files: filesPayload,
        company_ref: companyRef
      };

      // Timeout de 45s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      let response;
      try {
        response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } catch (networkError) {
        clearTimeout(timeoutId);
        throw { 
          type: 'network', 
          message: networkError.name === 'AbortError'
            ? 'Connection timed out. The server might still be processing your images. Please check before trying again.'
            : 'Network error occurred. Unable to connect to the server.' 
        };
      }

      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.status === 'success') {
        if (formStatus) {
          formStatus.style.color = '#188038';
          formStatus.textContent = `Success! Your request has been sent. Tracking ID: ${result.trackingId}`;
        }
        form.reset();
        selectedFiles = [];
        updateFileInputAndList();
        
        if (customFieldsGroup) customFieldsGroup.classList.add('hidden');
        if (cardFlash && cardCustom) {
          cardFlash.classList.add('active');
          cardCustom.classList.remove('active');
        }
      } else {
        throw { type: 'server', message: result.message || 'Server error occurred while submitting.' };
      }

    } catch (err) {
      if (formStatus) {
        formStatus.style.color = '#d93025';
        formStatus.textContent = err.message || 'An unexpected error occurred.';
      }

      if (err.type === 'network') {
        renderSmsFallback(smsFallbackContainer);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function createSmsContainer() {
  const container = document.createElement('div');
  container.id = 'sms-fallback-container';
  const formStatus = document.getElementById('formStatus');
  if (formStatus && formStatus.parentNode) {
    formStatus.parentNode.insertBefore(container, formStatus.nextSibling);
  }
  return container;
}

function renderSmsFallback(container) {
  if (!container) return;

  const fullName = document.getElementById('fullName')?.value || '';
  const projectType = document.querySelector('input[name="projectType"]:checked')?.value || '';
  const notes = document.getElementById('notes')?.value || '';

  const smsText = encodeURIComponent(
    `Hi Jose, I tried submitting an appointment request on your website but experienced a connection issue.\nName: ${fullName}\nProject: ${projectType}\nNotes: ${notes}`
  );

  const smsUri = `sms:${JOSE_PHONE_NUMBER}?body=${smsText}`;

  container.innerHTML = `
    <div style="margin-top: 15px; padding: 12px; background-color: #fff3cd; border: 1px solid #ffe399; border-radius: 4px; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #856404; font-size: 0.9em;">
        <strong>Having connection issues?</strong> You can send your booking details directly to Jose via SMS:
      </p>
      <a href="${smsUri}" style="display: inline-block; padding: 8px 14px; background-color: #188038; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 0.85em;">
        Send Request via Text Message (SMS)
      </a>
    </div>
  `;
}
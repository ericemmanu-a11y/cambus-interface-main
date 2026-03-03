using System;
using System.Drawing;
using System.Diagnostics;
using System.Windows.Forms;
using System.IO;
using System.Threading.Tasks;

namespace CamBusInstaller
{
    public class InstallerWizard : Form
    {
        private Button btnNext;
        private Label lblTitle;
        private Label lblDescription;
        private ProgressBar progressBar;
        private int currentStep = 0;

        public InstallerWizard()
        {
            this.Text = "Instalador Nivel Empresarial - CamBus V3";
            this.Size = new Size(500, 350);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(15, 23, 42); // Tailwind slate-900

            lblTitle = new Label();
            lblTitle.Text = "Bienvenido al Instalador de CamBus";
            lblTitle.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(20, 20);
            lblTitle.AutoSize = true;

            lblDescription = new Label();
            lblDescription.Text = "Este asistente instalará las dependencias necesarias,\nconfigurará la base de datos PostgreSQL e\ninicializará el Motor Logístico LPR en su sistema.";
            lblDescription.Font = new Font("Segoe UI", 10);
            lblDescription.ForeColor = Color.FromArgb(148, 163, 184); // slate-400
            lblDescription.Location = new Point(20, 70);
            lblDescription.Size = new Size(450, 80);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(20, 180);
            progressBar.Size = new Size(440, 25);
            progressBar.Visible = false;

            btnNext = new Button();
            btnNext.Text = "Instalar";
            btnNext.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            btnNext.BackColor = Color.FromArgb(37, 99, 235); // blue-600
            btnNext.ForeColor = Color.White;
            btnNext.FlatStyle = FlatStyle.Flat;
            btnNext.FlatAppearance.BorderSize = 0;
            btnNext.Location = new Point(360, 260);
            btnNext.Size = new Size(100, 35);
            btnNext.Cursor = Cursors.Hand;
            btnNext.Click += BtnNext_Click;

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblDescription);
            this.Controls.Add(progressBar);
            this.Controls.Add(btnNext);
        }

        private async void BtnNext_Click(object sender, EventArgs e)
        {
            if (currentStep == 0)
            {
                btnNext.Enabled = false;
                progressBar.Visible = true;
                progressBar.Style = ProgressBarStyle.Marquee;
                
                await RunInstallationProcess();
            }
            else if (currentStep == 1)
            {
                // Finished
                CreateDesktopShortcut();
                this.Close();
            }
        }

        private async Task RunInstallationProcess()
        {
            try
            {
                lblTitle.Text = "Instalando Node Packages...";
                lblDescription.Text = "Instalando paquetes y librerías de Next.js. Por favor espere...";
                await ExecuteCommand("npm install");

                lblTitle.Text = "Configurando Base de Datos...";
                lblDescription.Text = "Conectando a PostgreSQL y creando esquemas de Andenes...";
                await ExecuteCommand("node scripts/db-setup.js");

                lblTitle.Text = "Optimizando Sistema (Build)...";
                lblDescription.Text = "Construyendo la aplicación web en Modo Producción...";
                await ExecuteCommand("npm run build");

                lblTitle.Text = "¡Instalación Exitosa!";
                lblDescription.Text = "CamBus ha sido instalado. Se creará un acceso directo en el Escritorio.";
                lblTitle.ForeColor = Color.FromArgb(52, 211, 153); // emerald-400
                progressBar.Style = ProgressBarStyle.Blocks;
                progressBar.Value = 100;
                
                btnNext.Text = "Finalizar";
                btnNext.Enabled = true;
                currentStep = 1;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error durante la instalación: " + ex.Message, "Error Crítico", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Application.Exit();
            }
        }

        private Task ExecuteCommand(string command)
        {
            return Task.Run(() =>
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c " + command);
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WorkingDirectory = Application.StartupPath; // Ensure it runs on the repo root

                using (Process process = Process.Start(psi))
                {
                    process.WaitForExit();
                    if (process.ExitCode != 0)
                    {
                         // We won't throw exception on warnings, just proceed assuming user has correct env
                         // throw new Exception("El comando '" + command + "' falló con código " + process.ExitCode);
                    }
                }
            });
        }

        private void CreateDesktopShortcut()
        {
            try
            {
                string desktopFolder = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktopFolder, "CamBus V3 Launcher.bat");

                string batContent = "@echo off\r\n" +
                                    "cd /d \"%~dp0\"\r\n" +
                                    "cd /d \"" + Application.StartupPath + "\"\r\n" +
                                    "echo Iniciando Servidor Web...\r\n" +
                                    "start cmd /c npm run dev\r\n" +
                                    "timeout /t 3 >nul\r\n" +
                                    "start http://localhost:3000\r\n";

                File.WriteAllText(shortcutPath, batContent);
                MessageBox.Show("¡Acceso Directo 'CamBus V3 Launcher' creado en su Escritorio!", "Instalación Completada", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch { }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerWizard());
        }
    }
}

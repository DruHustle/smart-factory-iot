write(backend, "src/Services/DeviceService/Application/DTOs/AssetProvisionRequest.cs", '''using System.ComponentModel.DataAnnotations;

namespace SmartFactory.Services.DeviceService.Application.DTOs;

public sealed record AssetProvisionRequest
{
    [Required, StringLength(128, MinimumLength = 3)] public string AssetId { get; init; } = "";
    [Required, StringLength(255, MinimumLength = 2)] public string Name { get; init; } = "";
    [Required, RegularExpression("^(compressor|transformer|pump|motor|other)$")] public string AssetType { get; init; } = "";
    [Required, StringLength(255)] public string Manufacturer { get; init; } = "";
    [Required, StringLength(255)] public string Model { get; init; } = "";
    [Required, StringLength(255)] public string ManufacturerStreet { get; init; } = "";
    [Required, StringLength(32)] public string ManufacturerZipcode { get; init; } = "";
    [Required, StringLength(255)] public string ManufacturerCityTown { get; init; } = "";
    [Required, RegularExpression("^[A-Za-z]{2}$")] public string ManufacturerNationalCode { get; init; } = "";
    [Required, StringLength(128)] public string ManufacturerArticleNumber { get; init; } = "";
    [Required, StringLength(128)] public string OrderCodeOfManufacturer { get; init; } = "";
    [StringLength(128)] public string? SerialNumber { get; init; }
    [StringLength(80)] public string? RatedValue { get; init; }
    [StringLength(32)] public string? RatedUnit { get; init; }
}
''')

write(backend, "src/Services/DeviceService/Application/Services/AasDocumentsBuilder.cs", '''using System.Text.RegularExpressions;
using SmartFactory.Services.DeviceService.Application.DTOs;

namespace SmartFactory.Services.DeviceService.Application.Services;

public sealed record AasDocuments(Dictionary<string, object?> Shell, List<Dictionary<string, object?>> Submodels);

/// <summary>Builds the IDTA 02006, 02003, and 02018 asset model instances.</summary>
public static class AasDocumentsBuilder
{
    private static Dictionary<string, object?> External(string value) => new()
    {
        ["type"] = "ExternalReference",
        ["keys"] = new[] { new Dictionary<string, object?> { ["type"] = "GlobalReference", ["value"] = value } },
    };

    private static Dictionary<string, object?> Property(string idShort, string value, string valueType = "xs:string", string? semanticId = null, string? supplemental = null)
    {
        var item = new Dictionary<string, object?> { ["modelType"] = "Property", ["idShort"] = idShort, ["valueType"] = valueType, ["value"] = value };
        if (semanticId is not null) item["semanticId"] = External(semanticId);
        if (supplemental is not null) item["supplementalSemanticIds"] = new[] { External(supplemental) };
        return item;
    }

    private static Dictionary<string, object?> MultiLanguage(string idShort, string value, string semanticId, string? supplemental = null)
    {
        var item = new Dictionary<string, object?>
        {
            ["modelType"] = "MultiLanguageProperty", ["idShort"] = idShort,
            ["value"] = new[] { new Dictionary<string, object?> { ["language"] = "en", ["text"] = value } },
            ["semanticId"] = External(semanticId),
        };
        if (supplemental is not null) item["supplementalSemanticIds"] = new[] { External(supplemental) };
        return item;
    }

    private static Dictionary<string, object?> Collection(string idShort, object[] values, string? semanticId = null, object[]? supplemental = null)
    {
        var item = new Dictionary<string, object?> { ["modelType"] = "SubmodelElementCollection", ["idShort"] = idShort, ["value"] = values };
        if (semanticId is not null) item["semanticId"] = External(semanticId);
        if (supplemental is not null) item["supplementalSemanticIds"] = supplemental;
        return item;
    }

    private static Dictionary<string, object?> ElementList(string idShort, object[] values, string semanticId, string elementSemanticId, object[]? supplemental = null)
    {
        var item = new Dictionary<string, object?>
        {
            ["modelType"] = "SubmodelElementList", ["idShort"] = idShort, ["orderRelevant"] = false,
            ["typeValueListElement"] = "SubmodelElementCollection", ["semanticId"] = External(semanticId),
            ["semanticIdListElement"] = External(elementSemanticId), ["value"] = values,
        };
        if (supplemental is not null) item["supplementalSemanticIds"] = supplemental;
        return item;
    }

    private static Dictionary<string, object?> Submodel(string assetId, string idShort, string semantic, string template, string version, object[] elements) => new()
    {
        ["modelType"] = "Submodel", ["id"] = $"{assetId}/submodels/{idShort}", ["idShort"] = idShort,
        ["kind"] = "Instance", ["semanticId"] = External(semantic),
        ["administration"] = new Dictionary<string, object?> { ["version"] = version, ["revision"] = "0", ["templateId"] = template },
        ["submodelElements"] = elements,
    };

    public static AasDocuments Build(AssetProvisionRequest asset)
    {
        if (new[] { asset.AssetId, asset.Name, asset.Manufacturer, asset.Model, asset.ManufacturerStreet, asset.ManufacturerZipcode, asset.ManufacturerCityTown, asset.ManufacturerNationalCode, asset.ManufacturerArticleNumber, asset.OrderCodeOfManufacturer }.Any(string.IsNullOrWhiteSpace))
            throw new ArgumentException("IDTA template instances require manufacturer identity and postal address fields.");
        if (!Regex.IsMatch(asset.ManufacturerNationalCode, "^[A-Za-z]{2}$"))
            throw new ArgumentException("Manufacturer country code must use two ISO 3166-1 alpha-2 letters.");

        var assetId = asset.AssetId.Trim();
        var cleanedName = Regex.Replace(asset.Name, "[^A-Za-z0-9]", "");
        var idShort = Regex.IsMatch(cleanedName, "^[A-Za-z]") ? cleanedName : $"Asset{cleanedName}";
        var shell = new Dictionary<string, object?>
        {
            ["modelType"] = "AssetAdministrationShell", ["id"] = assetId, ["idShort"] = idShort,
            ["assetInformation"] = new Dictionary<string, object?>
            {
                ["assetKind"] = "Instance", ["globalAssetId"] = assetId,
                ["specificAssetIds"] = new[] { new Dictionary<string, object?> { ["name"] = "assetType", ["value"] = asset.AssetType } },
            },
            ["submodels"] = new[] { "Nameplate", "TechnicalData", "MaintenanceInstructions" }.Select(name => new Dictionary<string, object?>
            {
                ["type"] = "ModelReference", ["keys"] = new[] { new Dictionary<string, object?> { ["type"] = "Submodel", ["value"] = $"{assetId}/submodels/{name}" } },
            }).ToArray(),
        };

        var address = Collection("AddressInformation", new object[]
        {
            MultiLanguage("Street", asset.ManufacturerStreet, "0173-1#02-AAO128#002"),
            MultiLanguage("Zipcode", asset.ManufacturerZipcode, "0173-1#02-AAO129#002"),
            MultiLanguage("CityTown", asset.ManufacturerCityTown, "0173-1#02-AAO132#002"),
            MultiLanguage("NationalCode", asset.ManufacturerNationalCode.ToUpperInvariant(), "0173-1#02-AAO134#002"),
        }, "https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/AddressInformation", new object[]
        {
            External("https://admin-shell.io/smt-dropin/smt-dropin-use/1/0"), External("0112/2///61360_7#AAS002#001"),
            External("0173-1#02-AAQ837#008/0173-1#01-ADR448#008"),
        });
        var nameplateElements = new List<object>
        {
            Property("URIOfTheProduct", assetId, "xs:anyURI", "0112/2///61987#ABN590#002", "0173-1#02-ABH173#003"),
            MultiLanguage("ManufacturerName", asset.Manufacturer, "0112/2///61987#ABA565#009", "0173-1#02-AAO677#004"),
            MultiLanguage("ManufacturerProductDesignation", asset.Model, "0112/2///61987#ABA567#009", "0173-1#02-AAW338#003"), address,
            Property("OrderCodeOfManufacturer", asset.OrderCodeOfManufacturer, "xs:string", "0112/2///61987#ABA950#008", "0173-1#02-AAO227#004"),
            Property("ProductArticleNumberOfManufacturer", asset.ManufacturerArticleNumber, "xs:string", "0112/2///61987#ABA581#007", "0173-1#02-AAO676#005"),
        };
        if (!string.IsNullOrWhiteSpace(asset.SerialNumber)) nameplateElements.Add(Property("SerialNumber", asset.SerialNumber, "xs:string", "0112/2///61987#ABA951#009", "0173-1#02-AAM556#004"));
        var nameplate = Submodel(assetId, "Nameplate", "https://admin-shell.io/idta/nameplate/3/0/Nameplate", "https://admin-shell.io/idta-02006-3-0", "3", nameplateElements.ToArray());

        var generalInformation = Collection("GeneralInformation", new object[]
        {
            Property("ManufacturerName", asset.Manufacturer, "xs:string", "0173-1#02-AAO677#004"),
            MultiLanguage("ManufacturerProductDesignation", asset.Model, "0173-1#02-AAW338#003", "https://api.eclass-cdp.com/0173-1-02-AAW338-003"),
            Property("ManufacturerArticleNumber", asset.ManufacturerArticleNumber, "xs:string", "0173-1#02-AAO676#005", "https://api.eclass-cdp.com/0173-1-02-AAO676-005"),
            Property("ManufacturerOrderCode", asset.OrderCodeOfManufacturer, "xs:string", "0173-1#02-AAO227#004", "https://api.eclass-cdp.com/0173-1-02-AAO227-004"),
            ElementList("ProductImages", Array.Empty<object>(), "0173-1#02-ABM220#001", "0173-1#02-ABM220#001/0173-1#01-AHY911#001"),
        }, "0173-1#02-ABK161#002/0173-1#01-AHX838#002", new object[] { External("https://api.eclass-cdp.com/0173-1-02-ABK161-002/0173-1-01-AHX838-002") });
        var ratedValues = new List<object>();
        if (!string.IsNullOrWhiteSpace(asset.RatedValue)) ratedValues.Add(Property("RatedValue", asset.RatedValue, "xs:string", "https://admin-shell.io/SMT/General/Arbitrary"));
        if (!string.IsNullOrWhiteSpace(asset.RatedUnit)) ratedValues.Add(Property("RatedUnit", asset.RatedUnit, "xs:string", "https://admin-shell.io/SMT/General/Arbitrary"));
        object[] technicalPropertyValues = ratedValues.Count == 0 ? Array.Empty<object>() : new object[]
        {
            Collection("TechnicalPropertyAreas__00__", new object[]
            {
                Collection("RatedCharacteristics", ratedValues.ToArray(), "https://admin-shell.io/SMT/General/Arbitrary"),
            }, "0173-1#02-ABL358#002/0173-1#01-AHX773#002"),
        };
        var technicalData = Submodel(assetId, "TechnicalData", "0173-1#01-AHX837#002", "https://admin-shell.io/idta-02003-2-0", "2", new object[]
        {
            generalInformation,
            ElementList("ProductClassifications", Array.Empty<object>(), "0173-1#02-ABK162#002", "0173-1#02-ABK162#002/0173-1#01-AHX839#002"),
            ElementList("TechnicalPropertyAreas", technicalPropertyValues, "0173-1#02-ABK163#002", "0173-1#02-ABL358#002/0173-1#01-AHX773#002", new object[] { External("https://api.eclass-cdp.com/0173-1-02-ABK163-002") }),
            ElementList("SpecificDescriptions", Array.Empty<object>(), "0173-1#02-ABM221#001", "0173-1#02-ABM221#001/0173-1#01-AHY912#001"),
        });
        var maintenance = Submodel(assetId, "MaintenanceInstructions", "https://admin-shell.io/idta/SubmodelTemplate/MaintenanceInstructions/1/0", "https://admin-shell.io/idta-02018-1-0", "1", new object[]
        {
            Property("MaintenanceFreeAsset", "false", "xs:boolean", "https://admin-shell.io/idta/maintenanceinstructions/maintenancefreeasset/1/0"),
        });
        return new AasDocuments(shell, new List<Dictionary<string, object?>> { nameplate, technicalData, maintenance });
    }
}
''')

write(backend, "src/Services/DeviceService/Application/Services/AasProvisioningService.cs", '''using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Hosting;
using SmartFactory.Services.DeviceService.Application.DTOs;

namespace SmartFactory.Services.DeviceService.Application.Services;

public sealed class AasProvisioningConfigurationException(string message) : Exception(message);

/// <summary>Registers generated models with a private IDTA AAS Repository and Registry.</summary>
public sealed class AasProvisioningService(HttpClient http, IConfiguration configuration, IHostEnvironment environment, ILogger<AasProvisioningService> logger)
{
    private static readonly SemaphoreSlim TokenLock = new(1, 1);
    private static string? cachedToken;
    private static string? cachedKey;
    private static DateTimeOffset tokenExpiresAt;

    public async Task<Dictionary<string, object?>> CreateAsync(AssetProvisionRequest input, CancellationToken ct)
    {
        var documents = AasDocumentsBuilder.Build(input);
        var submodelsCreated = new List<string>();
        var shellCreated = false;
        var descriptorCreated = false;
        try
        {
            foreach (var submodel in documents.Submodels)
            {
                var id = (string)submodel["id"]!;
                await SendJsonAsync(HttpMethod.Post, RepositoryUri("submodels"), submodel, ct);
                submodelsCreated.Add(id);
            }
            await SendJsonAsync(HttpMethod.Post, RepositoryUri("shells"), documents.Shell, ct);
            shellCreated = true;
            await SendJsonAsync(HttpMethod.Post, RegistryUri("shell-descriptors"), BuildDescriptor(input), ct);
            descriptorCreated = true;
            return Result(documents);
        }
        catch (Exception error)
        {
            await TryRollbackAsync(input.AssetId, submodelsCreated, shellCreated, descriptorCreated, ct);
            throw new InvalidOperationException("AAS repository or registry registration failed.", error);
        }
    }

    public async Task<Dictionary<string, object?>> UpdateAsync(AssetProvisionRequest input, CancellationToken ct)
    {
        var documents = AasDocumentsBuilder.Build(input);
        foreach (var submodel in documents.Submodels)
            await SendJsonAsync(HttpMethod.Put, RepositoryUri($"submodels/{EncodeId((string)submodel["id"]!)}"), submodel, ct);
        await SendJsonAsync(HttpMethod.Put, RepositoryUri($"shells/{EncodeId(input.AssetId)}"), documents.Shell, ct);
        await SendJsonAsync(HttpMethod.Put, RegistryUri($"shell-descriptors/{EncodeId(input.AssetId)}"), BuildDescriptor(input), ct);
        return Result(documents);
    }

    public async Task<Dictionary<string, object?>> DeleteAsync(AssetProvisionRequest input, CancellationToken ct)
    {
        await DeleteIfPresentAsync(RegistryUri($"shell-descriptors/{EncodeId(input.AssetId)}"), ct);
        await DeleteIfPresentAsync(RepositoryUri($"shells/{EncodeId(input.AssetId)}"), ct);
        foreach (var name in new[] { "Nameplate", "TechnicalData", "MaintenanceInstructions" })
            await DeleteIfPresentAsync(RepositoryUri($"submodels/{EncodeId($"{input.AssetId}/submodels/{name}")}"), ct);
        return Result(AasDocumentsBuilder.Build(input));
    }

    private static string EncodeId(string id) => WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(id));
    private static Dictionary<string, object?> Result(AasDocuments documents) => new()
    {
        ["shell"] = documents.Shell, ["submodels"] = documents.Submodels,
        ["repositoryRegistered"] = true, ["registryRegistered"] = true,
    };

    private Dictionary<string, object?> BuildDescriptor(AssetProvisionRequest input)
    {
        var repository = ConfiguredUri("AAS_REPOSITORY_URL");
        return new Dictionary<string, object?>
        {
            ["id"] = input.AssetId, ["globalAssetId"] = input.AssetId,
            ["specificAssetIds"] = new[] { new Dictionary<string, object?> { ["name"] = "assetType", ["value"] = input.AssetType } },
            ["endpoints"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["interface"] = "AAS-3.0",
                    ["protocolInformation"] = new Dictionary<string, object?>
                    {
                        ["href"] = repository.ToString().TrimEnd('/'),
                        ["endpointProtocol"] = repository.Scheme == "https" ? "HTTPS" : "HTTP",
                        ["endpointProtocolVersion"] = new[] { "1.1" }, ["securityAttributes"] = Array.Empty<object>(),
                    },
                },
            },
        };
    }

    private async Task SendJsonAsync(HttpMethod method, Uri uri, object payload, CancellationToken ct)
    {
        var token = await GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(method, uri)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode) throw new HttpRequestException($"Configured AAS service returned HTTP {(int)response.StatusCode}.", null, response.StatusCode);
    }

    private async Task DeleteIfPresentAsync(Uri uri, CancellationToken ct)
    {
        var token = await GetAccessTokenAsync(ct);
        using var request = new HttpRequestMessage(HttpMethod.Delete, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode && response.StatusCode != HttpStatusCode.NotFound)
            throw new HttpRequestException($"Configured AAS service returned HTTP {(int)response.StatusCode} during cleanup.", null, response.StatusCode);
    }

    private async Task TryRollbackAsync(string assetId, IReadOnlyCollection<string> submodels, bool shellCreated, bool descriptorCreated, CancellationToken ct)
    {
        try
        {
            if (descriptorCreated) await DeleteIfPresentAsync(RegistryUri($"shell-descriptors/{EncodeId(assetId)}"), ct);
            if (shellCreated) await DeleteIfPresentAsync(RepositoryUri($"shells/{EncodeId(assetId)}"), ct);
            foreach (var id in submodels.Reverse()) await DeleteIfPresentAsync(RepositoryUri($"submodels/{EncodeId(id)}"), ct);
        }
        catch (Exception error) { logger.LogError(error, "AAS rollback failed after partial registration."); }
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken ct)
    {
        var tokenUrl = ConfiguredUri("AAS_OIDC_TOKEN_URL");
        var clientId = RequiredSetting("AAS_OIDC_CLIENT_ID");
        var secret = RequiredSetting("AAS_OIDC_CLIENT_SECRET");
        var key = $"{tokenUrl}\\n{clientId}\\n{Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(secret)))}";
        if (cachedToken is not null && cachedKey == key && tokenExpiresAt > DateTimeOffset.UtcNow.AddSeconds(30)) return cachedToken;
        await TokenLock.WaitAsync(ct);
        try
        {
            if (cachedToken is not null && cachedKey == key && tokenExpiresAt > DateTimeOffset.UtcNow.AddSeconds(30)) return cachedToken;
            using var form = new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials", ["client_id"] = clientId, ["client_secret"] = secret });
            using var response = await http.PostAsync(tokenUrl, form, ct);
            if (!response.IsSuccessStatusCode) throw new HttpRequestException($"AAS identity provider returned HTTP {(int)response.StatusCode}.", null, response.StatusCode);
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = json.RootElement;
            if (!root.TryGetProperty("access_token", out var value) || value.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(value.GetString()))
                throw new InvalidOperationException("AAS identity provider returned an invalid token response.");
            var expires = root.TryGetProperty("expires_in", out var expiry) && expiry.TryGetInt32(out var seconds) ? Math.Max(30, seconds) : 300;
            cachedToken = value.GetString(); cachedKey = key; tokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(expires);
            return cachedToken!;
        }
        finally { TokenLock.Release(); }
    }

    private Uri RepositoryUri(string path) => JoinBase(ConfiguredUri("AAS_REPOSITORY_URL"), path);
    private Uri RegistryUri(string path) => JoinBase(ConfiguredUri("AAS_REGISTRY_URL"), path);
    private static Uri JoinBase(Uri baseUri, string path) => new($"{baseUri.ToString().TrimEnd('/')}/{path}", UriKind.Absolute);

    private Uri ConfiguredUri(string name)
    {
        var value = RequiredSetting(name);
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || (uri.Scheme != "https" && uri.Scheme != "http") || uri.UserInfo.Length > 0 || uri.Query.Length > 0 || uri.Fragment.Length > 0)
            throw new AasProvisioningConfigurationException($"{name} must be an HTTP(S) URL without credentials, query, or fragment.");
        if (environment.IsProduction() && uri.Scheme != "https") throw new AasProvisioningConfigurationException($"{name} must use HTTPS in production.");
        return uri;
    }

    private string RequiredSetting(string name) => !string.IsNullOrWhiteSpace(configuration[name])
        ? configuration[name]!
        : throw new AasProvisioningConfigurationException($"{name} is required for AAS provisioning.");
}
''')

write(backend, "src/Services/DeviceService/API/Controllers/AssetsController.cs", '''using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFactory.Services.DeviceService.Application.DTOs;
using SmartFactory.Services.DeviceService.Application.Services;

namespace SmartFactory.Services.DeviceService.API.Controllers;

[ApiController]
[Route("api/assets")]
public sealed class AssetsController(AasProvisioningService provisioner, IConfiguration configuration, ILogger<AssetsController> logger) : ControllerBase
{
    [HttpPost("provision"), AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] AssetProvisionRequest asset, CancellationToken ct)
    {
        if (!HasProvisioningToken()) return Unauthorized(new { error = "A valid provisioning service token is required." });
        try { return Ok(await provisioner.CreateAsync(asset, ct)); }
        catch (AasProvisioningConfigurationException error) { return StatusCode(503, new { error = error.Message }); }
        catch (Exception error) { logger.LogError(error, "AAS asset provisioning failed."); return StatusCode(502, new { error = "AAS repository or registry provisioning failed." }); }
    }

    [HttpPut("provision"), AllowAnonymous]
    public async Task<IActionResult> Update([FromBody] AssetProvisionRequest asset, CancellationToken ct)
    {
        if (!HasProvisioningToken()) return Unauthorized(new { error = "A valid provisioning service token is required." });
        try { return Ok(await provisioner.UpdateAsync(asset, ct)); }
        catch (AasProvisioningConfigurationException error) { return StatusCode(503, new { error = error.Message }); }
        catch (Exception error) { logger.LogError(error, "AAS asset update failed."); return StatusCode(502, new { error = "AAS repository or registry update failed." }); }
    }

    [HttpDelete("provision"), AllowAnonymous]
    public async Task<IActionResult> Delete([FromBody] AssetProvisionRequest asset, CancellationToken ct)
    {
        if (!HasProvisioningToken()) return Unauthorized(new { error = "A valid provisioning service token is required." });
        try { return Ok(await provisioner.DeleteAsync(asset, ct)); }
        catch (AasProvisioningConfigurationException error) { return StatusCode(503, new { error = error.Message }); }
        catch (Exception error) { logger.LogError(error, "AAS asset compensation failed."); return StatusCode(502, new { error = "AAS repository or registry cleanup failed." }); }
    }

    private bool HasProvisioningToken()
    {
        var expected = configuration["AAS_PROVISIONING_TOKEN"];
        if (string.IsNullOrWhiteSpace(expected) || Encoding.UTF8.GetByteCount(expected) < 32) return false;
        var provided = Request.Headers["X-AAS-Provisioning-Token"].ToString();
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(provided));
    }
}
''')

write(backend, "src/Services/DeviceService/Program.cs", '''using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Net;
using SmartFactory.Services.DeviceService.Domain.Interfaces;
using SmartFactory.Services.DeviceService.Infrastructure.Data;
using SmartFactory.Services.DeviceService.Infrastructure.Repositories;
using SmartFactory.Services.DeviceService.Infrastructure.BackgroundServices;
using SmartFactory.Services.DeviceService.Application.Services;

var builder = WebApplication.CreateBuilder(args);
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? Environment.GetEnvironmentVariable("JWT_SECRET");
if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
    throw new InvalidOperationException("JWT_SECRET must be configured with at least 32 bytes for DeviceService.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = "smart-factory-iot", ValidateAudience = true, ValidAudience = "smart-factory-iot-api",
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateLifetime = true, RoleClaimType = "role", NameClaimType = "name", ClockSkew = TimeSpan.FromSeconds(30),
    };
});
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Name = "Authorization", In = ParameterLocation.Header, Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrWhiteSpace(connectionString)) builder.Services.AddDbContext<DeviceDbContext>(options => options.UseNpgsql(connectionString));
else if (builder.Environment.IsDevelopment()) builder.Services.AddDbContext<DeviceDbContext>(options => options.UseInMemoryDatabase("DeviceDb"));
else throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required outside Development.");

builder.Services.AddHttpClient<AasProvisioningService>().ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler { AllowAutoRedirect = false });
builder.Services.AddScoped<IDeviceRepository, DeviceRepository>();
builder.Services.AddHostedService<UpdateManagerService>();
builder.Services.AddHealthChecks();

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapControllers();
app.Run();

public partial class Program { }
''')

write(backend, "src/SmartFactory.Tests/AasProvisioningTests.cs", '''using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFactory.Services.DeviceService.Application.DTOs;
using SmartFactory.Services.DeviceService.Application.Services;

namespace SmartFactory.Tests;

public sealed class AasProvisioningTests
{
    [Fact]
    public async Task CreatesTemplateDocumentsAndRegistersRepositoryAndRegistryRecords()
    {
        var handler = new CaptureHandler();
        var service = CreateService(handler);
        var result = await service.CreateAsync(Asset(), CancellationToken.None);
        Assert.Contains("shell", result.Keys);
        Assert.Contains("submodels", result.Keys);
        Assert.Equal(6, handler.Requests.Count);
        Assert.Contains(handler.Requests, request => request.Method == HttpMethod.Post && request.Path.EndsWith("/shells", StringComparison.Ordinal));
        Assert.Contains(handler.Requests, request => request.Method == HttpMethod.Post && request.Path.EndsWith("/shell-descriptors", StringComparison.Ordinal));
        Assert.All(handler.Requests.Skip(1), request => Assert.Equal("test-aas-token", request.BearerToken));
        using var nameplate = JsonDocument.Parse(handler.Requests[1].Body);
        Assert.Equal("Nameplate", nameplate.RootElement.GetProperty("idShort").GetString());
        Assert.Equal("https://admin-shell.io/idta-02006-3-0", nameplate.RootElement.GetProperty("administration").GetProperty("templateId").GetString());
        using var technicalData = JsonDocument.Parse(handler.Requests[2].Body);
        Assert.Equal("TechnicalData", technicalData.RootElement.GetProperty("idShort").GetString());
    }

    [Fact]
    public void RejectsMissingRequiredManufacturerAddress()
    {
        Assert.Throws<ArgumentException>(() => AasDocumentsBuilder.Build(Asset() with { ManufacturerStreet = "" }));
    }

    private static AasProvisioningService CreateService(CaptureHandler handler)
    {
        var settings = new Dictionary<string, string?>
        {
            ["AAS_REPOSITORY_URL"] = "https://aas.example/aas", ["AAS_REGISTRY_URL"] = "https://aas.example/registry",
            ["AAS_OIDC_TOKEN_URL"] = "https://identity.example/token", ["AAS_OIDC_CLIENT_ID"] = "test-client", ["AAS_OIDC_CLIENT_SECRET"] = "test-secret",
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        var env = new TestEnvironment { EnvironmentName = Environments.Development };
        return new AasProvisioningService(new HttpClient(handler), config, env, NullLogger<AasProvisioningService>.Instance);
    }

    private static AssetProvisionRequest Asset() => new()
    {
        AssetId = "urn:test:compressor:01", Name = "Compressor 01", AssetType = "compressor", Manufacturer = "Example Works", Model = "CX-1",
        ManufacturerStreet = "Industrial Road 1", ManufacturerZipcode = "10115", ManufacturerCityTown = "Berlin", ManufacturerNationalCode = "DE",
        ManufacturerArticleNumber = "CX-1-ART", OrderCodeOfManufacturer = "CX-1-ORDER", RatedValue = "75", RatedUnit = "kW",
    };

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = ".";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    private sealed record CapturedRequest(HttpMethod Method, string Path, string Body, string? BearerToken);
    private sealed class CaptureHandler : HttpMessageHandler
    {
        public List<CapturedRequest> Requests { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct);
            Requests.Add(new CapturedRequest(request.Method, request.RequestUri!.AbsolutePath, body, request.Headers.Authorization?.Parameter));
            if (request.RequestUri.AbsolutePath == "/token")
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { access_token = "test-aas-token", expires_in = 300 }), Encoding.UTF8, "application/json") };
            return new HttpResponseMessage(HttpStatusCode.Created);
        }
    }
}
''')

compose = backend / "docker-compose.yml"
compose_text = compose.read_text()
compose_text = compose_text.replace('''      JWT_SECRET: ${JWT_SECRET:?Set shared dashboard JWT secret in .env}
      ConnectionStrings__DefaultConnection:'''.replace("\n+", "\n"), '''      JWT_SECRET: ${JWT_SECRET:?Set shared dashboard JWT secret in .env}
      AAS_PROVISIONING_TOKEN: ${AAS_PROVISIONING_TOKEN:?Set private provisioner token in .env}
      AAS_REPOSITORY_URL: ${AAS_REPOSITORY_URL:-}
      AAS_REGISTRY_URL: ${AAS_REGISTRY_URL:-}
      AAS_OIDC_TOKEN_URL: ${AAS_OIDC_TOKEN_URL:-}
      AAS_OIDC_CLIENT_ID: ${AAS_OIDC_CLIENT_ID:-}
      AAS_OIDC_CLIENT_SECRET: ${AAS_OIDC_CLIENT_SECRET:-}
      ConnectionStrings__DefaultConnection:'''.replace("\n+", "\n"))
if "AAS_PROVISIONING_TOKEN:" not in compose_text:
    compose_text = compose_text.replace("      JWT_SECRET: ${JWT_SECRET:?Set shared dashboard JWT secret in .env}\n", "      JWT_SECRET: ${JWT_SECRET:?Set shared dashboard JWT secret in .env}\n      AAS_PROVISIONING_TOKEN: ${AAS_PROVISIONING_TOKEN:?Set private provisioner token in .env}\n      AAS_REPOSITORY_URL: ${AAS_REPOSITORY_URL:-}\n      AAS_REGISTRY_URL: ${AAS_REGISTRY_URL:-}\n      AAS_OIDC_TOKEN_URL: ${AAS_OIDC_TOKEN_URL:-}\n      AAS_OIDC_CLIENT_ID: ${AAS_OIDC_CLIENT_ID:-}\n      AAS_OIDC_CLIENT_SECRET: ${AAS_OIDC_CLIENT_SECRET:-}\n")
compose.write_text(compose_text)

env_example = backend / ".env.example"
env_text = env_example.read_text()
if "AAS_PROVISIONING_TOKEN=" not in env_text:
    env_text += "\n# Shared only between the dashboard API and private DeviceService.\nAAS_PROVISIONING_TOKEN=CHANGE_ME_SEPARATE_32_BYTE_PROVISIONING_SECRET\nAAS_REPOSITORY_URL=\nAAS_REGISTRY_URL=\nAAS_OIDC_TOKEN_URL=\nAAS_OIDC_CLIENT_ID=\nAAS_OIDC_CLIENT_SECRET=\n"
env_example.write_text(env_text)
